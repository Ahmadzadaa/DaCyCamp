import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, FileUp, FolderKanban, Lock, MessageSquareText, Route } from 'lucide-react';
import type { ProjectsDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { fmtAgo } from '@/components/admin/format';

export const metadata: Metadata = { title: t('hub.projectsTitle') };

type Item = ProjectsDto['items'][number];
const COLS: Array<{ key: 'todo' | 'review' | 'returned' | 'done'; label: TKey; tone: string }> = [
  { key: 'todo', label: 'hub.colTodo', tone: 'muted' },
  { key: 'review', label: 'hub.colReview', tone: 'warn' },
  { key: 'returned', label: 'hub.colReturned', tone: 'err' },
  { key: 'done', label: 'hub.colDone', tone: 'ok' },
];
const colOf = (it: Item) =>
  it.status === 'PASSED' || it.state === 'completed'
    ? 'done'
    : it.status === 'SUBMITTED'
      ? 'review'
      : it.status === 'FAILED'
        ? 'returned'
        : 'todo';

export default async function ProjectsPage() {
  const d = await apiTry<ProjectsDto>('/me/projects');
  if (!d) redirect('/giris?next=/layiheler');
  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <h1>{t('hub.projectsTitle')}</h1>
          <p>{t('hub.projectsText')}</p>
        </div>
        <HeroArt kind="project" />
      </section>

      {d.items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t('hub.projectsEmpty')}
          description={t('hub.projectsEmptyHint')}
          action={
            <Link href="/yollar" className="b b-brand">
              <Route aria-hidden />
              {t('hub.pickPath')}
            </Link>
          }
        />
      ) : (
        <div className="kanban">
          {COLS.map((col) => {
            const items = d.items.filter((it) => colOf(it) === col.key);
            return (
              <section key={col.key} className="kan-col" aria-labelledby={`col-${col.key}`}>
                <h2 id={`col-${col.key}`} className="kan-h">
                  <span className={`badge badge-${col.tone}`}>
                    <span className="bdot" aria-hidden />
                    {t(col.label)}
                  </span>
                  <span className="text-sm text-muted">{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="kan-empty">{t('hub.colEmpty')}</p>
                ) : (
                  items.map((it) => {
                    const locked = it.state === 'locked';
                    const card = (
                      <>
                        <span className="eyebrow" style={{ color: it.trackColor }}>
                          {it.pathTitle}
                        </span>
                        <b className="kan-title">{it.title}</b>
                        <span className="kan-meta">
                          {it.estimatedHours ? (
                            <span>
                              <Clock aria-hidden /> {t('cert.hours', { n: it.estimatedHours })}
                            </span>
                          ) : null}
                          {it.deliverables ? (
                            <span>
                              <FileUp aria-hidden /> {t('hub.deliverables', { n: it.deliverables })}
                            </span>
                          ) : null}
                          <span>
                            {it.reviewMode === 'auto' ? t('hub.reviewAuto') : t('hub.reviewManual')}
                          </span>
                        </span>
                        {it.feedback && (col.key === 'returned' || col.key === 'done') ? (
                          <span className="kan-fb">
                            <MessageSquareText aria-hidden />
                            <span>{it.feedback}</span>
                          </span>
                        ) : null}
                        <span className="kan-ft">
                          {locked ? (
                            <span className="badge badge-muted">
                              <Lock aria-hidden /> {t('hub.locked')}
                            </span>
                          ) : it.submittedAt ? (
                            <span className="text-xs text-muted">
                              {t('hub.submittedAgo', { when: fmtAgo(it.submittedAt) })}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="xp">+{it.xp} XP</span>
                        </span>
                      </>
                    );
                    return locked ? (
                      <div key={it.id} className={cn('kan-card', 'lock')}>
                        {card}
                      </div>
                    ) : (
                      <Link key={it.id} href={it.url} className="kan-card">
                        {card}
                      </Link>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
