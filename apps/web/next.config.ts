import type { NextConfig } from 'next';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // DuckDB-WASM yalnız brauzerdə (dinamik import) işləyir; server bundle-ına salınmasın — webpack "critical dependency" xəbərdarlığı yox olur
  serverExternalPackages: ['@duckdb/duckdb-wasm'],
  async rewrites() {
    // Brauzer yalnız eyni mənşəli /api/* ilə danışır; Set-Cookie :3000-ə düşür, CORS yoxdur
    return [{ source: '/api/:path*', destination: `${API}/:path*` }];
  },
};

export default nextConfig;
