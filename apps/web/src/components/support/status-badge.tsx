import type { SupportTicketSummaryDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function SupportStatusBadge({ status }: { status: SupportTicketSummaryDto['status'] }) {
  return (
    <span className={cn('sup-st', status.toLowerCase())} data-status={status}>
      {t(`support.status.${status}`)}
    </span>
  );
}
