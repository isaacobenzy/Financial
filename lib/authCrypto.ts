import * as ExpoCrypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

/** Web Crypto can afford a higher work factor; Hermes uses pure-JS PBKDF2. */
const PBKDF2_ITERATIONS_NATIVE = 72_000;
const PBKDF2_ITERATIONS_WEB = 210_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/, '').trim();
  if (normalized.length % 2 !== 0) {
    throw new Error('hex length must be even');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  try {
    ExpoCrypto.getRandomValues(buf);
    return buf;
  } catch {
    // fall through
  }
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(buf);
    return buf;
  }
  throw new Error('Secure random generator unavailable on this runtime');
}

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function copyToTrueBuffer(bytes: Uint8Array): Uint8Array {
  const len = bytes.byteLength;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) view[i] = bytes[i];
  return view;
}

function getSubtle(): SubtleCrypto | null {
  const subtle = (globalThis as unknown as { crypto?: Crypto }).crypto?.subtle;
  return subtle ?? null;
}

export function pbkdf2IterationsForRuntime(): number {
  return getSubtle() ? PBKDF2_ITERATIONS_WEB : PBKDF2_ITERATIONS_NATIVE;
}

export type PasswordHash = {
  alg: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  hash: string;
};

async function derivePbkdf2Sha256(
  plaintext: string,
  salt: Uint8Array,
  iterations: number,
  keyBytes: number,
): Promise<Uint8Array> {
  const subtle = getSubtle();
  if (subtle) {
    const pwBytes = copyToTrueBuffer(encodeUtf8(plaintext));
    const saltCopy = copyToTrueBuffer(salt);
    const key = await subtle.importKey(
      'raw',
      pwBytes as unknown as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );
    const derived = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltCopy as unknown as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      key,
      keyBytes * 8,
    );
    return new Uint8Array(derived);
  }

  // Hermes / React Native: Web Crypto SubtleCrypto is unavailable.
  // Yield often so the UI spinner stays responsive while deriving.
  return pbkdf2Async(sha256, plaintext, salt, {
    c: iterations,
    dkLen: keyBytes,
    asyncTick: 8,
  });
}

export async function hashPassword(plaintext: string): Promise<PasswordHash> {
  const salt = randomBytes(SALT_BYTES);
  const iterations = pbkdf2IterationsForRuntime();
  const derived = await derivePbkdf2Sha256(
    plaintext,
    salt,
    iterations,
    KEY_BYTES,
  );
  return {
    alg: 'pbkdf2-sha256',
    iterations,
    salt: bytesToHex(salt),
    hash: bytesToHex(derived),
  };
}

export async function verifyPassword(
  plaintext: string,
  stored: PasswordHash,
): Promise<boolean> {
  if (!stored || stored.alg !== 'pbkdf2-sha256') {
    return false;
  }
  try {
    const salt = hexToBytes(stored.salt);
    const expected = hexToBytes(stored.hash);
    const candidate = await derivePbkdf2Sha256(
      plaintext,
      salt,
      stored.iterations,
      expected.length,
    );
    if (candidate.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= candidate[i] ^ expected[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  const e = String(email || '').trim();
  if (e.length < 5 || e.length > 254) return false;
  const at = e.indexOf('@');
  if (at <= 0) return false;
  const domain = e.slice(at + 1);
  const local = e.slice(0, at);
  if (local.length === 0 || domain.length < 3) return false;
  if (!domain.includes('.')) return false;
  const lastDot = domain.lastIndexOf('.');
  const tld = domain.slice(lastDot + 1);
  if (tld.length < 2) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  if (/[^\x21-\x7E]/.test(e)) return false;
  if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.\-]+$/.test(local)) return false;
  return true;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  errors: string[];
};

export function evaluatePassword(pw: string): PasswordStrength {
  const s = String(pw ?? '');
  const errors: string[] = [];
  if (s.length < 8) errors.push('at least 8 characters');
  if (!/[A-Za-z]/.test(s)) errors.push('at least one letter');
  if (!/[0-9]/.test(s)) errors.push('at least one digit');
  const extras = /[^A-Za-z0-9]/.test(s);
  const scoreRaw =
    (s.length >= 8 ? 1 : 0) +
    (s.length >= 12 ? 1 : 0) +
    (/[0-9]/.test(s) && /[A-Za-z]/.test(s) ? 1 : 0) +
    (extras ? 1 : 0) +
    (s.length >= 16 && extras && /[A-Z]/.test(s) && /[a-z]/.test(s) ? 1 : 0);

  const score = Math.max(0, Math.min(4, scoreRaw)) as 0 | 1 | 2 | 3 | 4;
  const label: PasswordStrength['label'] =
    score === 0
      ? 'weak'
      : score === 1
        ? 'fair'
        : score === 2
          ? 'good'
          : score === 3
            ? 'strong'
            : 'excellent';
  return { score, label, errors };
}
