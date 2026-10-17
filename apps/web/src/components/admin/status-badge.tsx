import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Qaralama / Dərc olunub */
export function StatusBadge({ published, className }: { published: boolean; className?: string }) {
  return published ? (
    <span className={cn('badge bg-ok/20 text-ok-ink', className)}>{t('common.published')}</span>
  ) : (
    <span className={cn('badge badge-muted', className)}>{t('common.draft')}</span>
  );
}
