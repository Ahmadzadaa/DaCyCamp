import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({
  text = 'DaCy',
  href = '/',
  className,
}: {
  text?: string | null;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('logo', className)} aria-label="DaCy Academy">
      <i>Dc</i>
      {text}
    </Link>
  );
}
