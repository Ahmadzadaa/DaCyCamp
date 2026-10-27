'use client';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="cr-card cr-empty" role="alert">
      <h1>{t('classroom.errorTitle')}</h1>
      <p>{t('classroom.errorHint')}</p>
      <Button type="button" onClick={reset}>
        {t('classroom.retry')}
      </Button>
    </div>
  );
}
