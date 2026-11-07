import { pbkdf2Sync, createHash } from 'crypto';
import { hashPassword, pbkdf2Sha256, sha256, verifyPassword } from '@/lib/password';

function toBytes(text: string) {
  return new TextEncoder().encode(text);
}

describe('password verifier', () => {
  it('matches SHA-256 for the empty string', () => {
    const actual = Buffer.from(sha256(new Uint8Array())).toString('hex');
    expect(actual).toBe(createHash('sha256').update('').digest('hex'));
  });

  it('matches Node PBKDF2-HMAC-SHA256', () => {
    const actual = Buffer.from(pbkdf2Sha256(toBytes('password'), toBytes('salt'), 2, 32));
    const expected = pbkdf2Sync('password', 'salt', 2, 32, 'sha256');
    expect(actual.equals(expected)).toBe(true);
  });

  it('verifies a hash and rejects a different password', async () => {
    const stored = await hashPassword('correct horse', 1000);
    expect(stored.includes('correct horse')).toBe(false);
    expect(stored.startsWith('pbkdf2-sha256$1000$')).toBe(true);
    expect(verifyPassword('correct horse', stored)).toBe(true);
    expect(verifyPassword('wrong horse', stored)).toBe(false);
  });
});
