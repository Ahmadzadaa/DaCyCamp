import type { Level } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const N: Record<Level, 1 | 2 | 3> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };

/** Səviyyə: 3 şaquli zolaq (7 / 11 / 16px), istiqamət rəngində doldurulur + ad */
export function LevelBars({
  level,
  color,
  className,
  label,
  children,
}: {
  level: Level;
  /** admin-in dəyişdiyi ad (verilməsə standart) */
  label?: string;
  color?: string;
  className?: string;
  /** addan sonra əlavə mətn (məs. «· Aysel Məmmədova») */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn('lvl', `l${N[level]}`, className)}
      style={color ? { ['--c' as string]: color } : undefined}
    >
      <i aria-hidden>
        <b />
        <b />
        <b />
      </i>
      {label ?? t(`level.${level}`)}
      {children}
    </div>
  );
}
