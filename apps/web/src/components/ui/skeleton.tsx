import { cn } from '@/lib/utils';
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('sk', className)} aria-hidden />;
}
