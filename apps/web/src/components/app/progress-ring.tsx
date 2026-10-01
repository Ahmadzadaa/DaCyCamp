export function ProgressRing({
  percent,
  size = 72,
  color = '#2BD4A4',
}: {
  percent: number;
  size?: number;
  color?: string;
}) {
  const c = 2 * Math.PI * 15.5;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r="15.5"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 18 18)"
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .4s' }}
      />
    </svg>
  );
}
