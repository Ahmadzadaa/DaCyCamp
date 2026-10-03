import Link from 'next/link';
import { History } from 'lucide-react';
import { az, type AuditLogDto, type AuditPageDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { initials } from '@/lib/utils';
import { fmtWhen } from './format';

const PALETTE = ['#6C7CF0', '#F0A93E', '#F06A8D', '#4B5BD0', '#B87610', '#159B74'];
function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

/** «course.archive» + details.archived=false → «arxivdən çıxardı» kimi cümlə */
export function auditSentence(it: AuditLogDto): string {
  let key = it.action.replace(/\./g, '_');
  if (key === 'course_archive' && it.details?.archived === false) key = 'course_unarchive';
  const sentences = az.audit.sentence as Record<string, string>;
  const title =
    it.entityTitle ?? (typeof it.details?.stepTitle === 'string' ? it.details.stepTitle : '');
  if (sentences[key] && title) return sentences[key]!.replace('{title}', title);
  const label = (az.audit.actions as Record<string, string>)[key] ?? it.action;
  return title ? `${label} — «${title}»` : label;
}

/** Son admin əməliyyatları (kim · nə · nə vaxt) — Kurslar və Ümumi baxış səhifələrində */
export async function ActivityFeed({
  limit = 5,
  action,
  title,
}: {
  limit?: number;
  /** məs. "course." — yalnız kurs əməliyyatları */
  action?: string;
  title?: string;
}) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (action) qs.set('action', action);
  const page = await apiTry<AuditPageDto>(`/admin/audit?${qs}`);
  if (!page) return null;
  return (
    <section className="box feed" aria-labelledby="feed-h">
      <div className="feed-h">
        <h2 id="feed-h" className="box-h !mb-0">
          <History aria-hidden />
          {title ?? t('audit.title')}
        </h2>
        <Link href="/admin/tarixce" className="box-more !mt-0">
          {t('audit.viewAll')}
        </Link>
      </div>
      {page.items.length === 0 ? (
        <p className="py-4 text-sm text-muted">{t('audit.empty')}</p>
      ) : (
        <ul>
          {page.items.map((it) => {
            const who = it.actor.id
              ? (it.actor.name ?? it.actor.email.split('@')[0]!)
              : t('audit.system');
            return (
              <li key={it.id}>
                <span className="avatar sm" style={{ background: colorFor(it.actor.email || who) }}>
                  {it.actor.id ? initials(who) : 'S'}
                </span>
                <p>
                  <b>{who}</b> {auditSentence(it)}
                </p>
                <time dateTime={it.createdAt}>{fmtWhen(it.createdAt)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
