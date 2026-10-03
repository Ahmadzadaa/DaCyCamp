import { redirect } from 'next/navigation';
import { FEATURES } from '@/lib/features';

/** Bölmə müvəqqəti gizlədilib (lib/features.ts) — URL kataloqa yönləndirilir */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.contests) redirect('/kurslar');
  return children;
}
