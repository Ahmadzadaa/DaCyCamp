import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('box flex flex-col items-center gap-3 py-12 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-full bg-paper text-muted">
        <Icon className="size-6" />
      </span>
      <h3 className="text-lg">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
