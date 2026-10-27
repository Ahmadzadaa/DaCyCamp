'use client';
import { usePathname } from 'next/navigation';
/** Keep the existing overview navigation; a classroom has its own contextual header and tabs. */
export function AcademyFrame({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const classroom = usePathname().startsWith('/akademiya/sinif/');
  return (
    <div className="flex flex-col gap-6">
      {classroom ? null : header}
      {children}
    </div>
  );
}
