import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="logo text-2xl">
        <i>Dc</i>
        {t('app.name')}
      </div>
      <h1 className="text-2xl">{t('common.notFound')}</h1>
      <p className="text-muted">{t('common.notFoundDesc')}</p>
      <Link href="/" className="b b-brand">
        {t('common.goHome')}
      </Link>
    </main>
  );
}
