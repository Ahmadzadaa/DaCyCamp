import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const AT = 'dacy_at';
const RT = 'dacy_rt';
const PROTECTED = [
  /^\/(panel|profil|admin|sertifikatlar|baslangic|fealiyyetim|tecrube|imtahanlar|layiheler|destek|akademiya|muellim)(\/|$)/,
  /^\/kurs\/[^/]+\/[^/]+\/[^/]+/,
];
const AUTH_PAGES = [/^\/giris(?:\/|$)/, /^\/qeydiyyat(?:\/|$)/];
const homeFor = (role?: string) =>
  role === 'ADMIN' || role === 'INSTRUCTOR' ? '/admin' : role === 'TEACHER' ? '/muellim' : '/panel';

function replaceSessionCookies(req: NextRequest, values: Map<string, string>) {
  const cookies = new Map(req.cookies.getAll().map(({ name, value }) => [name, value]));
  cookies.delete(AT);
  cookies.delete(RT);
  for (const [name, value] of values) if (value) cookies.set(name, value);
  const headers = new Headers(req.headers);
  headers.set('cookie', Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; '));
  return headers;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const at = req.cookies.get(AT)?.value;
  const rt = req.cookies.get(RT)?.value;
  const needsAuth = PROTECTED.some((r) => r.test(pathname));
  const isAuthPage = AUTH_PAGES.some((r) => r.test(pathname));
  let role: string | undefined;
  let valid = false;
  let unavailable = false;
  const cookie = req.headers.get('cookie') ?? '';
  if (at) {
    try {
      const r = await fetch(`${API}/auth/me`, {
        headers: { cookie },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      valid = r.ok;
      if (valid) role = ((await r.json()) as { role: string }).role;
      else unavailable = r.status >= 500;
    } catch {
      unavailable = true;
    }
  }
  if (valid)
    return isAuthPage
      ? NextResponse.redirect(new URL(homeFor(role), req.url))
      : NextResponse.next();

  if (rt && !unavailable) {
    try {
      const r = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { cookie },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        role = ((await r.json()) as { role: string }).role;
        const setCookies = r.headers.getSetCookie();
        const values = new Map(
          setCookies.map((value) => {
            const pair = value.split(';')[0]!;
            const i = pair.indexOf('=');
            return [pair.slice(0, i), pair.slice(i + 1)];
          }),
        );
        const response = isAuthPage
          ? NextResponse.redirect(new URL(homeFor(role), req.url))
          : NextResponse.next({ request: { headers: replaceSessionCookies(req, values) } });
        for (const value of setCookies) response.headers.append('set-cookie', value);
        return response;
      }
      unavailable = r.status >= 500 || r.status === 429;
    } catch {
      unavailable = true;
    }
  }
  // A temporary service failure must never destroy a valid refresh session.
  if (unavailable && (needsAuth || isAuthPage))
    return new NextResponse('Xidmət müvəqqəti əlçatmazdır. Bir az sonra yenidən cəhd edin.', {
      status: 503,
    });
  const response = needsAuth
    ? NextResponse.redirect(
        new URL(`/giris?next=${encodeURIComponent(pathname + search)}`, req.url),
      )
    : NextResponse.next({ request: { headers: replaceSessionCookies(req, new Map()) } });
  if (!unavailable) {
    if (at) response.cookies.delete(AT);
    if (rt) response.cookies.delete(RT);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js|map)$).*)',
  ],
};
