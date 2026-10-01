import { createHmac } from 'node:crypto';
import { env } from '../config/env';

export function normalizeAnswer(raw: string, caseSensitive: boolean): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  return caseSensitive ? s : s.toLowerCase();
}
/** HMAC-SHA256(CTF_PEPPER, normalizə(cavab)) — açıq cavab heç vaxt saxlanılmır */
export function hashAnswer(raw: string, caseSensitive: boolean): string {
  return createHmac('sha256', env.CTF_PEPPER)
    .update(normalizeAnswer(raw, caseSensitive))
    .digest('hex');
}
