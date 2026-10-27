import { t } from '@/lib/i18n';
export default function Loading() {
  return (
    <div className="cr-classroom" role="status" aria-label={t('common.loading')}>
      <div className="sk h-56" />
      <div className="sk h-12" />
      <div className="cr-grid">
        <div className="sk h-96" />
        <div className="sk h-64" />
      </div>
    </div>
  );
}
