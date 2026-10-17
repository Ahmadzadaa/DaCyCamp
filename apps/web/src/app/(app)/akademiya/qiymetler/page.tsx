import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import type { AcademyMyGradeDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { fmtScore, fmtZoned } from '@/components/academy/format';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.tabs.grades')} · ${t('academy.title')}` };
}

/** Yalnız açıqlanmış qiymətlər (qaralama qiymət tələbəyə göstərilmir) */
export default async function MyGradesPage() {
  const rows = await apiTry<AcademyMyGradeDto[]>('/academy/me/grades');
  if (!rows) notFound();
  if (!rows.length) return <EmptyState icon={GraduationCap} title={t('academy.empty.grades')} />;
  return (
    <div className="tbl-wrap">
      <table className="tbl-admin" data-testid="academy-grades">
        <thead>
          <tr>
            <th>{t('academy.tabs.assignments')}</th>
            <th>{t('academy.f.group')}</th>
            <th>{t('academy.detail.raw')}</th>
            <th>{t('academy.detail.penalty')}</th>
            <th>{t('academy.detail.final')}</th>
            <th>{t('academy.f.date')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.assignmentId}>
              <td>
                <Link
                  href={`/akademiya/tapsiriqlar/${g.assignmentId}`}
                  className="ttl hover:underline"
                >
                  {g.assignmentTitle}
                </Link>
                {g.feedback ? <div className="slug line-clamp-1">{g.feedback}</div> : null}
              </td>
              <td>{g.groupCode}</td>
              <td>{fmtScore(g.rawScore)}</td>
              <td>{g.latePenalty ? `−${fmtScore(g.latePenalty)}` : '—'}</td>
              <td>
                <b>
                  {fmtScore(g.finalScore)} / {fmtScore(g.maxScore)}
                </b>
              </td>
              <td>{fmtZoned(g.releasedAt, { time: false })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
