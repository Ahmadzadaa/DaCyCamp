import { cn } from '@/lib/utils';

export function TrackBadge({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('badge badge-track', className)} style={{ ['--c' as string]: color }}>
      {children}
    </span>
  );
}
