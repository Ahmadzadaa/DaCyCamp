import type { NextConfig } from 'next';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // dev göstəricisi sidebar-ın altındakı kartın üstünə düşür
  devIndicators: false,
  // DuckDB-WASM yalnız brauzerdə (dinamik import) işləyir; server bundle-ına salınmasın — webpack "critical dependency" xəbərdarlığı yox olur
  serverExternalPackages: ['@duckdb/duckdb-wasm'],
  // brauzer terminalı birbaşa API-nin WebSocket-inə qoşulur (Next proksisi WS ötürmür)
  env: { NEXT_PUBLIC_API_PORT: process.env.API_PORT ?? '4000' },
  async rewrites() {
    // Brauzer yalnız eyni mənşəli /api/* ilə danışır; Set-Cookie :3000-ə düşür, CORS yoxdur
    return [{ source: '/api/:path*', destination: `${API}/:path*` }];
  },
};

export default nextConfig;
