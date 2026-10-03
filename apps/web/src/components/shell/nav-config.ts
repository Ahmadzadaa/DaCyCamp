import {
  Activity,
  Award,
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  Folder,
  FolderKanban,
  History,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Route,
  ShieldCheck,
  SquareTerminal,
  Swords,
  Tags,
  Trash2,
  Trophy,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { TKey } from '@/lib/i18n';
import { FEATURES } from '@/lib/features';

export interface NavItem {
  href: string;
  label: TKey;
  icon: LucideIcon;
  /** aktiv vəziyyət üçün yol nümunələri (verilməsə href ilə başlayan) */
  match?: RegExp[];
  /** «YENİ» nişanı */
  isNew?: boolean;
  /** yalnız daxil olmuş istifadəçi üçün */
  auth?: boolean;
  /** yalnız ADMIN (müəllim görmür) */
  adminOnly?: boolean;
  /** yalnız heyət (ADMIN / INSTRUCTOR) — tələbə qabığında admin panelə keçid */
  staffOnly?: boolean;
  /** sayğac (məs. yoxlama gözləyən layihələr) — qabıq doldurur */
  countKey?: 'reviews' | 'support';
  /** ikon kafelinin rəngi (iOS üslubu, `--ic`) */
  tint?: string;
}
export interface NavSection {
  title?: TKey;
  items: NavItem[];
}

/** Tələbə sidebar-ı — dizayn referansı v2 (skrinşotlar) */
export const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { href: '/panel', label: 'shell.panel', icon: LayoutDashboard, auth: true, tint: '#0A84FF' },
      {
        href: '/fealiyyetim',
        label: 'shell.activity',
        icon: Activity,
        auth: true,
        tint: '#30D158',
      },
      { href: '/liderler', label: 'shell.leaderboard', icon: Trophy, isNew: true, tint: '#FF9F0A' },
    ],
  },
  {
    title: 'shell.learn',
    items: [
      {
        href: '/yollar',
        label: 'shell.roadmap',
        icon: Route,
        match: [/^\/yollar/, /^\/yol\//],
        tint: '#5E5CE6',
      },
      {
        href: '/kurslar',
        label: 'shell.courses',
        icon: BookOpen,
        match: [/^\/kurslar/, /^\/kurs\//],
        tint: '#12B886',
      },
      {
        href: '/tecrube',
        label: 'shell.practice',
        icon: FlaskConical,
        isNew: true,
        auth: true,
        tint: '#BF5AF2',
      },
      {
        href: '/imtahanlar',
        label: 'shell.exams',
        icon: ClipboardCheck,
        auth: true,
        tint: '#FF375F',
      },
    ],
  },
  {
    title: 'shell.apply',
    items: [
      ...(FEATURES.projects
        ? [
            {
              href: '/layiheler',
              label: 'shell.projects' as const,
              icon: FolderKanban,
              isNew: true,
              auth: true,
              tint: '#FF9F0A',
            },
          ]
        : []),
      ...(FEATURES.contests
        ? [
            {
              href: '/yarislar',
              label: 'shell.contests' as const,
              icon: Swords,
              isNew: true,
              tint: '#FF453A',
            },
          ]
        : []),
    ],
  },
  {
    title: 'shell.secHelp',
    items: [
      {
        href: '/destek',
        label: 'shell.support',
        icon: LifeBuoy,
        auth: true,
        countKey: 'support',
        tint: '#30B0C7',
      },
    ],
  },
  {
    title: 'shell.secManage',
    items: [
      {
        href: '/admin',
        label: 'shell.adminPanel',
        icon: ShieldCheck,
        staffOnly: true,
        tint: '#8E8E93',
      },
    ],
  },
];

/** Header-dəki pill menyu: bölmələr */
export const PILL_NAV: Array<{
  key: 'learn' | 'apply' | 'certs';
  label: TKey;
  icon: LucideIcon;
  href: (authed: boolean) => string;
  match: RegExp[];
}> = [
  {
    key: 'learn',
    label: 'shell.learn',
    icon: BookOpen,
    href: (authed) => (authed ? '/panel' : '/kurslar'),
    match: [
      /^\/panel/,
      /^\/fealiyyetim/,
      /^\/liderler/,
      /^\/yollar/,
      /^\/yol\//,
      /^\/kurslar/,
      /^\/kurs\//,
      /^\/tecrube/,
      /^\/imtahanlar/,
      /^\/baslangic/,
    ],
  },
  ...(FEATURES.projects || FEATURES.contests
    ? [
        {
          key: 'apply' as const,
          label: 'shell.apply' as const,
          icon: FolderKanban,
          href: () => (FEATURES.projects ? '/layiheler' : '/yarislar'),
          match: [/^\/layiheler/, /^\/yarislar/],
        },
      ]
    : []),
  {
    key: 'certs',
    label: 'shell.certificates',
    icon: Award,
    href: () => '/sertifikatlar',
    match: [/^\/sertifikat/],
  },
];

/** Mobil alt naviqasiya: 4 əsas + «Daha çox» */
export const BOTTOM_NAV: NavItem[] = [
  { href: '/panel', label: 'shell.panel', icon: LayoutDashboard, auth: true, tint: '#0A84FF' },
  {
    href: '/yollar',
    label: 'shell.roadmap',
    icon: Route,
    match: [/^\/yollar/, /^\/yol\//],
    tint: '#5E5CE6',
  },
  { href: '/kurslar', label: 'shell.courses', icon: BookOpen, match: [/^\/kurslar/, /^\/kurs\//] },
  FEATURES.projects
    ? { href: '/layiheler', label: 'shell.projects', icon: FolderKanban, auth: true }
    : {
        href: '/tecrube',
        label: 'shell.practice',
        icon: FlaskConical,
        auth: true,
        tint: '#BF5AF2',
      },
];

/** Admin sidebar-ı — skrinşot: Ümumi baxış · KONTENT · İNSANLAR · SİSTEM */
export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      {
        href: '/admin',
        label: 'shell.adminOverview',
        icon: LayoutDashboard,
        match: [/^\/admin\/?$/],
        tint: '#0A84FF',
      },
    ],
  },
  {
    title: 'shell.secContent',
    items: [
      { href: '/admin/kurslar', label: 'shell.courses', icon: BookOpen, tint: '#12B886' },
      { href: '/admin/movzular', label: 'shell.topics', icon: Tags, tint: '#FF9F0A' },
      { href: '/admin/istiqametler', label: 'shell.tracks', icon: Layers, tint: '#5E5CE6' },
      { href: '/admin/yollar', label: 'shell.paths', icon: Route, tint: '#BF5AF2' },
      {
        href: '/admin/karyera',
        label: 'shell.roadmaps',
        icon: Map,
        adminOnly: true,
        tint: '#30D158',
      },
      { href: '/admin/fayllar', label: 'shell.files', icon: Folder, tint: '#64D2FF' },
      { href: '/admin/idxal', label: 'shell.zipImport', icon: Upload, tint: '#8E8E93' },
    ],
  },
  {
    title: 'shell.secPeople',
    items: [
      { href: '/admin/telebeler', label: 'shell.students', icon: Users, tint: '#0A84FF' },
      {
        href: '/admin/destek',
        label: 'shell.support',
        icon: LifeBuoy,
        countKey: 'support',
        tint: '#30B0C7',
      },
      {
        href: '/admin/layiheler',
        label: 'shell.reviewsQueue',
        icon: ClipboardCheck,
        countKey: 'reviews',
        tint: '#FF9F0A',
      },
      { href: '/admin/lablar', label: 'shell.labSessions', icon: SquareTerminal, tint: '#1C1C1E' },
    ],
  },
  {
    title: 'shell.secSystem',
    items: [
      {
        href: '/admin/tarixce',
        label: 'shell.auditLog',
        icon: History,
        adminOnly: true,
        tint: '#8E8E93',
      },
      {
        href: '/admin/kurslar?status=deleted',
        label: 'shell.trash',
        icon: Trash2,
        adminOnly: true,
        tint: '#FF453A',
      },
    ],
  },
];

/** Rola görə görünən elementlər (boş bölmələr atılır) */
export function visibleSections(
  sections: NavSection[],
  opts: { staff?: boolean; isAdmin?: boolean },
): NavSection[] {
  return sections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) => (opts.isAdmin !== false || !it.adminOnly) && (!it.staffOnly || opts.staff),
      ),
    }))
    .filter((sec) => sec.items.length > 0);
}

/** Verilən yol (və sorğu) üçün element aktivdirmi */
export function isActive(
  item: Pick<NavItem, 'href' | 'match'>,
  path: string,
  search = '',
): boolean {
  const [base, query] = item.href.split('?');
  if (query) return path === base && search.includes(query);
  if (item.match) return item.match.some((r) => r.test(path));
  // ?status=deleted ilə açılan Silinənlər «Kurslar»ı aktiv göstərməsin
  if (base === '/admin/kurslar' && search.includes('status=deleted')) return false;
  return path === base || path.startsWith(`${base}/`);
}
