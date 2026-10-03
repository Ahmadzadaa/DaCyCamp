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

const UI_SCRIPT = `try{var q=new URLSearchParams(location.search).get('ui');if(q==='ios'||q==='klassik')localStorage.setItem('dacy_ui',q);if(localStorage.getItem('dacy_ui')==='ios')document.documentElement.setAttribute('data-ui','ios')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const levels = await getLevelLabels();
  return (
    <html lang="az" suppressHydrationWarning>
      <head>
        {/* Dizayn təklifi (iOS üslubu): ?ui=ios açır, ?ui=klassik qaytarır; ilk boyamadan əvvəl tətbiq olunur */}
        <script dangerouslySetInnerHTML={{ __html: UI_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <LevelLabelsProvider labels={levels}>{children}</LevelLabelsProvider>
        </Providers>
      </body>
    </html>
  );
}
