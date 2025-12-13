import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET = (process.env.CRYPTO_SECRET || '').padEnd(32, '0').slice(0, 32);

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), encrypted.toString('hex'), authTag.toString('hex')].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivHex, dataHex, authTagHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
