/**
 * Local password verifier. The hash stays on device; it is not a server credential.
 *
 * PBKDF2-HMAC-SHA256, 100,000 iterations. OWASP's server recommendation is higher,
 * but those iteration counts stall the JS thread on a phone. This replaces plaintext
 * storage. It does not encrypt the ledger.
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DK_LEN = 32;
const PREFIX = 'pbkdf2-sha256';

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number) {
  return (x >>> n) | (x << (32 - n));
}

export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const total = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(total - 4, bitLen >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((word, index) => outView.setUint32(index * 4, word));
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = 64;
  let k = key.length > block ? sha256(key) : key;
  if (k.length < block) {
    const padded = new Uint8Array(block);
    padded.set(k);
    k = padded;
  }
  const oPad = new Uint8Array(block);
  const iPad = new Uint8Array(block);
  for (let i = 0; i < block; i++) {
    oPad[i] = k[i] ^ 0x5c;
    iPad[i] = k[i] ^ 0x36;
  }
  return sha256(concat(oPad, sha256(concat(iPad, message))));
}

export function pbkdf2Sha256(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  dkLen = DK_LEN,
): Uint8Array {
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new Error('Invalid PBKDF2 iteration count');
  }
  const hLen = 32;
  const blocks = Math.ceil(dkLen / hLen);
  const out = new Uint8Array(blocks * hLen);
  for (let i = 1; i <= blocks; i++) {
    const index = new Uint8Array(4);
    new DataView(index.buffer).setUint32(0, i);
    let u = hmacSha256(password, concat(salt, index));
    const t = new Uint8Array(u);
    for (let c = 1; c < iterations; c++) {
      u = hmacSha256(password, u);
      for (let j = 0; j < hLen; j++) t[j] ^= u[j];
    }
    out.set(t, (i - 1) * hLen);
  }
  return out.slice(0, dkLen);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error('Invalid hex');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.getRandomValues) {
    const out = new Uint8Array(length);
    webCrypto.getRandomValues(out);
    return out;
  }
  const Crypto = await import('expo-crypto');
  return new Uint8Array(Crypto.getRandomBytes(length));
}

export function isPasswordHash(value: string): boolean {
  const parts = value.split('$');
  return parts.length === 4 && parts[0] === PREFIX && /^\d+$/.test(parts[1]) && parts[2].length > 0 && parts[3].length > 0;
}

export function passwordIterations(): number {
  return ITERATIONS;
}

export async function hashPassword(password: string, iterations = ITERATIONS): Promise<string> {
  const salt = await randomBytes(SALT_BYTES);
  const dk = pbkdf2Sha256(utf8(password), salt, iterations, DK_LEN);
  return `${PREFIX}$${iterations}$${bytesToHex(salt)}$${bytesToHex(dk)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!isPasswordHash(stored)) return false;
  const [, iterRaw, saltHex, hashHex] = stored.split('$');
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = hexToBytes(saltHex);
    expected = hexToBytes(hashHex);
  } catch {
    return false;
  }
  const actual = pbkdf2Sha256(utf8(password), salt, Number(iterRaw), expected.length);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
