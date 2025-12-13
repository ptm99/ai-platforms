import CryptoJS from 'crypto-js';

function secret(): string {
  const s = process.env.KEY_ENC_SECRET;
  if (!s) throw new Error('KEY_ENC_SECRET not set');
  return s;
}

export function encrypt(plain: string): string {
  return CryptoJS.AES.encrypt(plain, secret()).toString();
}

export function decrypt(cipher: string): string {
  const bytes = CryptoJS.AES.decrypt(cipher, secret());
  const out = bytes.toString(CryptoJS.enc.Utf8);
  if (!out) throw new Error('Failed to decrypt API key (check KEY_ENC_SECRET)');
  return out;
}

export function sha256Hex(input: string): string {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}
