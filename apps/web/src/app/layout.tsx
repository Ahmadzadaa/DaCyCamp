import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './globals.css';
import { Providers } from './providers';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: { default: t('app.name'), template: `%s · ${t('app.name')}` },
  description: t('app.tagline'),
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#13233F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
