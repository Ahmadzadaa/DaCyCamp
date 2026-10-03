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
  countKey?: 'reviews';
}
export interface NavSection {
  title?: TKey;
  items: NavItem[];
}

/** Tələbə sidebar-ı — dizayn referansı v2 (skrinşotlar) */
export const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { href: '/panel', label: 'shell.panel', icon: LayoutDashboard, auth: true },
      { href: '/fealiyyetim', label: 'shell.activity', icon: Activity, auth: true },
      { href: '/liderler', label: 'shell.leaderboard', icon: Trophy, isNew: true },
    ],
  },
  {
    title: 'shell.learn',
    items: [
      { href: '/yollar', label: 'shell.paths', icon: Route, match: [/^\/yollar/, /^\/yol\//] },
      {
        href: '/kurslar',
        label: 'shell.courses',
        icon: BookOpen,
        match: [/^\/kurslar/, /^\/kurs\//],
      },
      { href: '/tecrube', label: 'shell.practice', icon: FlaskConical, isNew: true, auth: true },
      { href: '/imtahanlar', label: 'shell.exams', icon: ClipboardCheck, auth: true },
    ],
  },
  {
    title: 'shell.apply',
    items: [
      { href: '/layiheler', label: 'shell.projects', icon: FolderKanban, isNew: true, auth: true },
      { href: '/yarislar', label: 'shell.contests', icon: Swords, isNew: true },
    ],
  },
  {
    title: 'shell.secManage',
    items: [{ href: '/admin', label: 'shell.adminPanel', icon: ShieldCheck, staffOnly: true }],
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
  {
    key: 'apply',
    label: 'shell.apply',
    icon: FolderKanban,
    href: () => '/layiheler',
    match: [/^\/layiheler/, /^\/yarislar/],
  },
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
  { href: '/panel', label: 'shell.panel', icon: LayoutDashboard, auth: true },
  { href: '/yollar', label: 'shell.paths', icon: Route, match: [/^\/yollar/, /^\/yol\//] },
  { href: '/kurslar', label: 'shell.courses', icon: BookOpen, match: [/^\/kurslar/, /^\/kurs\//] },
  { href: '/layiheler', label: 'shell.projects', icon: FolderKanban, auth: true },
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
      },
    ],
  },
  {
    title: 'shell.secContent',
    items: [
      { href: '/admin/kurslar', label: 'shell.courses', icon: BookOpen },
      { href: '/admin/movzular', label: 'shell.topics', icon: Tags },
      { href: '/admin/istiqametler', label: 'shell.tracks', icon: Layers },
      { href: '/admin/yollar', label: 'shell.paths', icon: Route },
      { href: '/admin/karyera', label: 'shell.roadmaps', icon: Map, adminOnly: true },
      { href: '/admin/fayllar', label: 'shell.files', icon: Folder },
      { href: '/admin/idxal', label: 'shell.zipImport', icon: Upload },
    ],
  },
  {
    title: 'shell.secPeople',
    items: [
      { href: '/admin/telebeler', label: 'shell.students', icon: Users },
      {
        href: '/admin/layiheler',
        label: 'shell.reviewsQueue',
        icon: ClipboardCheck,
        countKey: 'reviews',
      },
      { href: '/admin/lablar', label: 'shell.labSessions', icon: SquareTerminal },
    ],
  },
  {
    title: 'shell.secSystem',
    items: [
      { href: '/admin/tarixce', label: 'shell.auditLog', icon: History, adminOnly: true },
      {
        href: '/admin/kurslar?status=deleted',
        label: 'shell.trash',
        icon: Trash2,
        adminOnly: true,
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
