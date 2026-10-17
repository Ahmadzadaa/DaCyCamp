import Link from 'next/link';
import type { AcademyMyAssignmentDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { StudentStatusBadge } from './badges';
import { fmtScore, fmtZoned } from './format';

/** Tələbənin tapşırıq siyahısı (ümumi baxış və tapşırıqlar səhifəsi) */
export function AssignmentRows({ rows }: { rows: AcademyMyAssignmentDto[] }) {
  return (
    <ul className="sup-list" data-testid="academy-assignments">
      {rows.map((a) => (
        <li key={a.id}>
          <Link
            href={`/akademiya/tapsiriqlar/${a.id}`}
            className="ac-row"
            data-testid="academy-assignment-row"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <b className="truncate">{a.title}</b>
              <span className="ac-meta">
                <span>{a.groupCode}</span>
                <span>{t(`academy.type.${a.type}`)}</span>
                <span>
                  {t('academy.f.due')}: <b>{fmtZoned(a.effectiveDueAt)}</b>
                  {a.extended ? ` · ${t('academy.f.extended')}` : ''}
                </span>
                <span>
                  {t('academy.f.attemptsOf', { used: a.attemptsUsed, max: a.maxAttempts })}
                </span>
              </span>
            </span>
            <span className="ac-side">
              <StudentStatusBadge status={a.status} overdue={a.overdue} />
              {a.finalScore !== null ? (
                <span className="ac-score">
                  {fmtScore(a.finalScore)} <small>/ {fmtScore(a.maxScore)}</small>
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
