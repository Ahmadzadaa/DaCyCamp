import type { ResultTable as RT } from '@dacy/shared';
import { normalizeCell } from '@dacy/shared';
import { t } from '@/lib/i18n';

/** Sorğu nəticəsi cədvəli (ilk N sətir) */
export function ResultTable({ table, max = 200 }: { table: RT; max?: number }) {
  if (table.columns.length === 0)
    return <pre className="text-on-dark-muted">{t('ws.noOutput')}</pre>;
  const rows = table.rows.slice(0, max);
  return (
    <div className="overflow-auto">
      <table className="tbl">
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td
                  key={j}
                  className={v === null || v === undefined ? 'text-on-dark-muted' : undefined}
                >
                  {v === null || v === undefined ? 'NULL' : normalizeCell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > max ? (
        <p className="px-3.5 py-2 text-xs text-on-dark-muted">{t('ws.truncated', { n: max })}</p>
      ) : null}
    </div>
  );
}
