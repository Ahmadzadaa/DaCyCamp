import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource-variable/inter';
import './globals.css';
import './ios.css';
import { Providers } from './providers';
import { LevelLabelsProvider } from '@/components/level-labels';
import { getLevelLabels } from '@/lib/level-labels';
import { getLocale, t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return {
    title: { default: t('app.name'), template: `%s · ${t('app.name')}` },
    description: t('app.tagline'),
  };
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const levels = await getLevelLabels();
  return (
    // data-ui="ios" — təsdiqlənmiş dizayn v3 (ios.css bu atributa bağlıdır)
    <html lang={getLocale()} data-ui="ios" suppressHydrationWarning>
      <body>
        <Providers>
          <LevelLabelsProvider labels={levels}>{children}</LevelLabelsProvider>
        </Providers>
      </body>
    </html>
  );
}
