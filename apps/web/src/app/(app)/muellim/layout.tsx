import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';

/** Müəllim paneli: yalnız daxil olmuş istifadəçi; hüquqlar hər sorğuda serverdə qrup üzrə yoxlanılır */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/muellim');
  return <div className="flex flex-col gap-6">{children}</div>;
}
