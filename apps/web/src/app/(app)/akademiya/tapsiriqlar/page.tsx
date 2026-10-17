import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import type { AcademyMyAssignmentDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { AssignmentRows } from '@/components/academy/assignment-rows';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.tabs.assignments')} · ${t('academy.title')}` };
}

const FILTERS: Array<{ key: string; label: TKey }> = [
  { key: '', label: 'academy.teacher.all' },
  { key: 'LAB', label: 'academy.tabs.labs' },
  { key: 'PROJECT', label: 'academy.type.PROJECT' },
  { key: 'EXISTING_CHALLENGE', label: 'academy.type.EXISTING_CHALLENGE' },
];

/** Tapşırıqlar: bütün qruplar üzrə; növ filtri (laboratoriyalar ayrıca) */
export default async function MyAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const current = FILTERS.some((f) => f.key === type) ? (type ?? '') : '';
  const rows = await apiTry<AcademyMyAssignmentDto[]>(
    `/academy/me/assignments${current ? `?type=${current}` : ''}`,
  );
  if (!rows) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('academy.f.type')}>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/akademiya/tapsiriqlar?type=${f.key}` : '/akademiya/tapsiriqlar'}
            className={cn('chip', current === f.key && 'on')}
            aria-current={current === f.key ? 'true' : undefined}
          >
            {t(f.label)}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <section className="box">
          <AssignmentRows rows={rows} />
        </section>
      ) : (
        <EmptyState icon={ClipboardList} title={t('academy.empty.assignments')} />
      )}
    </div>
  );
}
