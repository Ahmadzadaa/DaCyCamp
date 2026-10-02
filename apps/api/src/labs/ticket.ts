import { createHmac, timingSafeEqual } from 'node:crypto';

/** WebSocket üçün qısa ömürlü bilet: brauzer cookie-ni başqa porta göndərə bilmədiyi üçün HMAC imzalı token */
export interface LabTicket {
  sid: string; // LabSession.id
  uid: string; // User.id
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');

function sign(secret: string, body: string) {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signTicket(secret: string, t: LabTicket, ttlSec = 60): string {
  const body = b64(JSON.stringify({ ...t, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  return `${body}.${sign(secret, body)}`;
}

export function verifyTicket(secret: string, token: string): LabTicket | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as LabTicket & {
      exp: number;
    };
    if (!p.sid || !p.uid || p.exp < Math.floor(Date.now() / 1000)) return null;
    return { sid: p.sid, uid: p.uid };
  } catch {
    return null;
  }
}
