import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const AT = 'dacy_at';
const RT = 'dacy_rt';
const PROTECTED = [
  /^\/panel/,
  /^\/profil/,
  /^\/admin/,
  /^\/sertifikatlar/,
  /^\/kurs\/[^/]+\/[^/]+\/[^/]+/,
  /^\/baslangic/,
];
const AUTH_PAGES = [/^\/giris/, /^\/qeydiyyat/];

function parseSetCookie(sc: string): { name: string; value: string } | null {
  const first = sc.split(';')[0];
  const eq = first?.indexOf('=') ?? -1;
  if (!first || eq < 0) return null;
  return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const at = req.cookies.get(AT)?.value;
  const rt = req.cookies.get(RT)?.value;
  const needsAuth = PROTECTED.some((r) => r.test(pathname));
  const isAuthPage = AUTH_PAGES.some((r) => r.test(pathname));

  if (at) {
    if (isAuthPage) return NextResponse.redirect(new URL('/panel', req.url));
    return NextResponse.next();
  }

  // Access bitib, refresh var → səssiz yeniləmə
  if (rt) {
    try {
      const r = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { cookie: `${RT}=${rt}` },
      });
      if (r.ok) {
        const setCookies = r.headers.getSetCookie();
        const parsed = setCookies
          .map(parseSetCookie)
          .filter((x): x is { name: string; value: string } => !!x);
        const newAt = parsed.find((c) => c.name === AT)?.value;
        const newRt = parsed.find((c) => c.name === RT)?.value;
        const headers = new Headers(req.headers);
        headers.set('cookie', `${AT}=${newAt ?? ''}; ${RT}=${newRt ?? rt}`);
        const res = isAuthPage
          ? NextResponse.redirect(new URL('/panel', req.url))
          : NextResponse.next({ request: { headers } });
        for (const sc of setCookies) res.headers.append('set-cookie', sc);
        return res;
      }
    } catch {
      /* API əlçatmazdırsa aşağıdakı qaydalar işləyir */
    }
    if (needsAuth) {
      const res = NextResponse.redirect(
        new URL(`/giris?next=${encodeURIComponent(pathname + search)}`, req.url),
      );
      res.cookies.delete(RT);
      return res;
    }
  }

  if (needsAuth)
    return NextResponse.redirect(
      new URL(`/giris?next=${encodeURIComponent(pathname + search)}`, req.url),
    );
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js|map)$).*)',
  ],
};
