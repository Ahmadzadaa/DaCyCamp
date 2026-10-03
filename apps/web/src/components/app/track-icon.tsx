import { BookOpen, ChartColumn, Database, Shield, type LucideIcon } from 'lucide-react';

/** İstiqamətin ikonu (Track.icon və ya slug-a görə): analitika · mühəndislik · təhlükəsizlik */
export function trackIconFor(icon?: string | null, slug = ''): LucideIcon {
  const k = `${icon ?? ''} ${slug}`.toLowerCase();
  if (/bar|chart|analytic/.test(k)) return ChartColumn;
  if (/workflow|database|engineer|db/.test(k)) return Database;
  if (/shield|cyber|secur/.test(k)) return Shield;
  return BookOpen;
}

/** Rəngli yumşaq fonda istiqamət ikonu (kart altı, panel siyahısı) */
export function TrackTile({
  color,
  icon,
  slug,
  size = 'md',
  className,
}: {
  color: string;
  icon?: string | null;
  slug?: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const Icon = trackIconFor(icon, slug);
  return (
    <span
      className={`tic${size === 'lg' ? ' lg' : ''}${className ? ` ${className}` : ''}`}
      style={{ ['--c' as string]: color }}
      aria-hidden
    >
      <Icon />
    </span>
  );
}
