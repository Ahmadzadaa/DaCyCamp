import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { t } from '@/lib/i18n';

/** Növbəti mərhələdə aktivləşəcək bölmələr üçün boş vəziyyət */
export function SoonPage({
  phase,
  icon,
  title,
}: {
  phase: number;
  icon?: LucideIcon;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {title ? <h1 className="text-2xl">{title}</h1> : null}
      <EmptyState
        icon={icon}
        title={t('common.soon')}
        description={`${t('admin.phase', { n: phase })} — ${t('admin.soonPhase', { phase })}`}
      />
    </div>
  );
}
