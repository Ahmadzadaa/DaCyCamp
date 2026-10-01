/** Kart üstü üçün sadə ikon — istiqamətin ikonuna/slug-ına görə */
export function TrackMotif({ icon, slug }: { icon?: string | null; slug: string }) {
  const kind = icon ?? slug;
  if (kind.includes('bar') || kind.includes('analytics')) {
    return (
      <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden>
        <rect x="10" y="60" width="18" height="40" fill="#fff" />
        <rect x="38" y="40" width="18" height="60" fill="#fff" />
        <rect x="66" y="20" width="18" height="80" fill="#fff" />
        <rect x="94" y="50" width="18" height="50" fill="#fff" />
      </svg>
    );
  }
  if (kind.includes('workflow') || kind.includes('engineering')) {
    return (
      <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden>
        <circle cx="20" cy="55" r="14" fill="#fff" />
        <circle cx="60" cy="55" r="14" fill="#fff" />
        <circle cx="100" cy="55" r="14" fill="#fff" />
        <path d="M34 55h12M74 55h12" stroke="#fff" strokeWidth="6" />
      </svg>
    );
  }
  if (kind.includes('shield') || kind.includes('cyber') || kind.includes('security')) {
    return (
      <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden>
        <path d="M60 10 L100 26 V58 C100 82 82 98 60 106 C38 98 20 82 20 58 V26 Z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden>
      <polyline points="5,90 35,60 60,72 90,30 115,40" fill="none" stroke="#fff" strokeWidth="8" />
    </svg>
  );
}
