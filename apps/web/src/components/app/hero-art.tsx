/**
 * Hero blokların sağındakı xətti illüstrasiyalar (dizayn v2): boz xətlər, mint vurğular.
 * Dekorativdir — ekran oxuyucularından gizlədilir.
 */
export type HeroArtKind =
  | 'catalog'
  | 'dashboard'
  | 'route'
  | 'course'
  | 'trophy'
  | 'activity'
  | 'flask'
  | 'exam'
  | 'project'
  | 'swords'
  | 'award';

const G = '#93A1BC';
const M = '#2BD4A4';
const D = '#6C7CF0';

export function HeroArt({ kind }: { kind: HeroArtKind }) {
  return (
    <div className="hero-art" aria-hidden>
      {ART[kind]}
    </div>
  );
}

const common = {
  fill: 'none',
  stroke: G,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ART: Record<HeroArtKind, React.ReactNode> = {
  // kataloq: «sxem» — düyünlər və xətlər
  catalog: (
    <svg viewBox="0 0 280 170" {...common}>
      <path d="M30 32 H112 V56" />
      <path d="M126 70 H150" />
      <path d="M170 70 H196 V24 H210" />
      <path d="M238 24 H252" />
      <path d="M112 84 V140 H32" />
      <path d="M160 80 V118 H214 V108" />
      <path d="M258 32 V88 H226" />
      <circle cx="24" cy="32" r="6" />
      <rect x="98" y="56" width="28" height="28" rx="6" />
      <rect x="210" y="10" width="28" height="28" rx="6" stroke={M} />
      <circle cx="258" cy="24" r="6" stroke={M} />
      <circle cx="26" cy="140" r="6" />
      <circle cx="160" cy="70" r="10" stroke={M} />
      <circle cx="160" cy="70" r="3.5" fill={M} stroke="none" />
      <circle cx="214" cy="102" r="6" stroke={M} />
      <circle cx="220" cy="88" r="6" />
      <path d="M234 128 l10 10 M244 128 l-10 10" />
      <circle cx="176" cy="150" r="2" fill={G} stroke="none" />
      <circle cx="188" cy="150" r="2" fill={G} stroke="none" />
      <circle cx="200" cy="150" r="2" fill={G} stroke="none" />
    </svg>
  ),
  // panel: sütunlar + xətti qrafik
  dashboard: (
    <svg viewBox="0 0 260 160" {...common}>
      <path d="M12 150 H248" />
      <rect x="30" y="100" width="26" height="50" rx="3" />
      <rect x="72" y="70" width="26" height="80" rx="3" />
      <rect x="114" y="90" width="26" height="60" rx="3" />
      <rect x="156" y="42" width="26" height="108" rx="3" stroke={M} strokeWidth="2.5" />
      <rect x="198" y="60" width="26" height="90" rx="3" />
      <polyline points="43,96 85,64 127,80 169,32 211,50" stroke={M} strokeWidth="2.5" />
      <circle cx="169" cy="32" r="5" fill={M} stroke="none" />
    </svg>
  ),
  // yol: qırıq xətt, keçilmiş düyünlər, bayraq
  route: (
    <svg viewBox="0 0 280 170" {...common}>
      <path
        d="M24 130 C 70 130, 70 60, 120 60 S 170 130, 220 130 S 260 60, 262 40"
        strokeDasharray="6 7"
      />
      <circle cx="24" cy="130" r="12" fill={M} stroke={M} />
      <path d="m19 130 3 3 6-6" stroke="#0B3D30" />
      <circle cx="120" cy="60" r="12" fill={M} stroke={M} />
      <path d="m115 60 3 3 6-6" stroke="#0B3D30" />
      <circle cx="220" cy="130" r="12" fill="#13233F" stroke={D} strokeWidth="3" />
      <circle cx="262" cy="40" r="12" fill="#13233F" />
      <path d="M262 24 v-14 l14 5 -14 5" fill={M} stroke={M} />
    </svg>
  ),
  // kurs: cədvəl / dataset
  course: (
    <svg viewBox="0 0 220 140" {...common}>
      <rect x="30" y="20" width="160" height="100" rx="10" />
      <path d="M30 46h160" />
      <path d="M70 20v100" />
      <path d="M85 66h40M85 86h60M85 106h25" stroke={M} />
      <path d="M42 66h16M42 86h16M42 106h16" />
      <circle cx="44" cy="33" r="3" fill={G} stroke="none" />
      <circle cx="56" cy="33" r="3" fill={G} stroke="none" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 240 150" {...common}>
      <path d="M40 140 H200" />
      <rect x="58" y="80" width="38" height="60" rx="4" />
      <rect x="101" y="50" width="38" height="90" rx="4" stroke={M} strokeWidth="2.5" />
      <rect x="144" y="96" width="38" height="44" rx="4" />
      <path d="M108 22 h24 v8 a12 12 0 0 1 -24 0 z" stroke={M} />
      <path d="M120 42 v6 M112 50 h16" stroke={M} />
      <path d="M72 70 l5 -10 5 10 M158 86 l5 -10 5 10" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 260 150" {...common}>
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 9 }).map((__, c) => {
          const on = (r * 7 + c * 3) % 5 < 2 || (c > 5 && r % 2 === 0);
          return (
            <rect
              key={`${r}-${c}`}
              x={22 + c * 25}
              y={18 + r * 25}
              width="18"
              height="18"
              rx="4"
              stroke={on ? M : G}
              fill={on && (r + c) % 3 === 0 ? M : 'none'}
              opacity={on ? 1 : 0.6}
            />
          );
        }),
      )}
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 240 150" {...common}>
      <path d="M100 20 v40 L64 128 a6 6 0 0 0 5 8 h102 a6 6 0 0 0 5 -8 L140 60 V20" />
      <path d="M92 20 h56" />
      <path d="M78 104 h84" stroke={M} />
      <circle cx="108" cy="118" r="4" fill={M} stroke="none" />
      <circle cx="132" cy="112" r="3" fill={M} stroke="none" />
      <path d="M180 40 l12 -12 M186 52 h16 M176 24 v-14" />
      <path d="M40 60 h18 M30 80 h26" />
    </svg>
  ),
  exam: (
    <svg viewBox="0 0 240 150" {...common}>
      <rect x="62" y="16" width="116" height="124" rx="10" />
      <rect x="96" y="8" width="48" height="16" rx="4" />
      <path d="m82 54 8 8 14-14" stroke={M} strokeWidth="2.5" />
      <path d="M116 56 h44" />
      <path d="m82 86 8 8 14-14" stroke={M} strokeWidth="2.5" />
      <path d="M116 88 h44" />
      <rect x="82" y="108" width="20" height="20" rx="4" />
      <path d="M116 118 h30" />
    </svg>
  ),
  project: (
    <svg viewBox="0 0 240 150" {...common}>
      <path d="M30 128 h180 a8 8 0 0 0 8 -8 V44 a8 8 0 0 0 -8 -8 h-88 l-14 -16 H38 a8 8 0 0 0 -8 8 z" />
      <path d="M70 70 v34" stroke={M} strokeWidth="3" />
      <path d="M110 70 v18" strokeWidth="3" />
      <path d="M150 70 v46" stroke={M} strokeWidth="3" />
      <path d="M190 70 v24" strokeWidth="3" />
    </svg>
  ),
  swords: (
    <svg viewBox="0 0 240 150" {...common}>
      <path d="M150 105 L60 15 V8 h7 l90 90" />
      <path d="M140 118 l26 -26 M152 110 l16 16 M164 122 l8 -8" stroke={M} />
      <path d="M90 105 L180 15 V8 h-7 L83 98" />
      <path d="M100 118 L74 92 M88 110 L72 126 M76 122 l-8 -8" stroke={M} />
      <circle cx="120" cy="140" r="2" fill={G} stroke="none" />
    </svg>
  ),
  award: (
    <svg viewBox="0 0 240 150" {...common}>
      <circle cx="120" cy="58" r="40" />
      <circle cx="120" cy="58" r="26" stroke={M} />
      <path d="m110 58 7 7 13-13" stroke={M} strokeWidth="2.5" />
      <path d="M96 92 L86 140 l34 -18 34 18 -10 -48" />
    </svg>
  ),
};
