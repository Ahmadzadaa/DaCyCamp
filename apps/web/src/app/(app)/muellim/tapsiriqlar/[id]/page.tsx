import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type {
  AcademyAssignmentDto,
  AcademyExtensionDto,
  AcademyGroupDto,
  AcademyRevisionDto,
  AcademySubmissionDto,
} from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Markdown } from '@/components/app/markdown';
import { AssignmentStatusBadge } from '@/components/academy/badges';
import { fetchRoster } from '@/components/academy/server';
import { fmtScore, fmtZoned } from '@/components/academy/format';
import { AssignmentActions } from '@/components/academy/teacher/assignment-actions';
import {
  ExtensionsManager,
  ResourcesManager,
  RubricEditor,
} from '@/components/academy/teacher/assignment-managers';
import { SubmissionsTable } from '@/components/academy/teacher/submissions-table';

export function generateMetadata(): Metadata {
  return { title: t('academy.teacherTitle') };
}

export default async function TeacherAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await apiTry<AcademyAssignmentDto>(`/academy/assignments/${id}`);
  if (!a) notFound();
  const [g, subs, exts, roster, revisions] = await Promise.all([
    apiTry<AcademyGroupDto>(`/academy/groups/${a.groupId}`),
    apiTry<AcademySubmissionDto[]>(`/academy/assignments/${id}/submissions`),
    apiTry<AcademyExtensionDto[]>(`/academy/assignments/${id}/extensions`),
    fetchRoster(a.groupId),
    apiTry<AcademyRevisionDto[]>(`/academy/assignments/${id}/revisions`),
  ]);
  if (!g) notFound();
  const can = (x: string) => g.permissions.includes(x as never);
  const tz = g.timezone;
  const readOnly = a.status === 'ARCHIVED' || a.status === 'CANCELLED';
  const canEdit =
    !readOnly &&
    (a.status === 'DRAFT' ? can('assignment.editDraft') : can('assignment.editPublished'));

  return (
    <>
      <Link href={`/muellim/qruplar/${g.id}`} className="back-link">
        <ArrowLeft aria-hidden />
        {g.code} · {g.name}
      </Link>
      <div className="ph1 !mb-0">
        <div className="min-w-0">
          <h1>{a.title}</h1>
          <p className="flex flex-wrap items-center gap-2">
            <AssignmentStatusBadge status={a.status} />
            <span>{t(`academy.type.${a.type}`)}</span>
            <span>· {t(`academy.gradingType.${a.gradingType}`)}</span>
            <span>· {t('academy.teacher.version', { n: a.version })}</span>
          </p>
        </div>
        <div className="ph1-act">
          <AssignmentActions a={a} permissions={g.permissions} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="box flex flex-col gap-4">
            <dl className="ac-kv">
              <div>
                <dt>{t('academy.f.available')}</dt>
                <dd>{fmtZoned(a.availableAt, { tz })}</dd>
              </div>
              <div>
                <dt>{t('academy.f.due')}</dt>
                <dd>{fmtZoned(a.dueAt, { tz })}</dd>
              </div>
              <div>
                <dt>{t('academy.f.latePolicy')}</dt>
                <dd>
                  {t(`academy.latePolicy.${a.latePolicy}`)}
                  {a.latePolicy === 'ACCEPT_WITH_PENALTY' ? ` (−${a.latePenaltyPercent}%)` : ''}
                </dd>
              </div>
              <div>
                <dt>{t('academy.f.maxAttempts')}</dt>
                <dd>{a.maxAttempts}</dd>
              </div>
              <div>
                <dt>{t('academy.f.selection')}</dt>
                <dd>{t(`academy.selection.${a.attemptSelection}`)}</dd>
              </div>
              <div>
                <dt>{t('academy.f.maxScore')}</dt>
                <dd>{fmtScore(a.maxScore)}</dd>
              </div>
            </dl>
            {a.description ? <Markdown content={a.description} /> : null}
            <div>
              <h2 className="box-h">{t('academy.f.items')}</h2>
              <ul className="flex flex-col gap-2">
                {a.items.map((i) => (
                  <li
                    key={i.id}
                    className="ac-item-h rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <b>{i.step?.title ?? i.title}</b>{' '}
                      <span className="text-muted">
                        · {t(`academy.itemKind.${i.kind}`)}
                        {i.step ? ` · ${i.step.courseTitle}` : ''}
                      </span>
                      {i.step && !i.step.available ? (
                        <span className="block text-xs text-error">
                          {t('academy.form.unavailable')}
                        </span>
                      ) : null}
                    </span>
                    <b>{fmtScore(i.maxScore)}</b>
                  </li>
                ))}
              </ul>
            </div>
            {a.deliverables.length ? (
              <div>
                <h2 className="box-h">{t('academy.f.deliverables')}</h2>
                <ul className="list-disc pl-5 text-sm">
                  {a.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {subs ? (
            <section className="box flex flex-col gap-3" aria-labelledby="t-subs">
              <h2 id="t-subs" className="box-h !mb-0">
                {t('academy.teacher.submissions')}
              </h2>
              <SubmissionsTable
                assignmentId={a.id}
                rows={subs}
                canRelease={can('grade.release')}
                timezone={tz}
              />
            </section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="box" aria-labelledby="t-res">
            <h2 id="t-res" className="box-h">
              {t('academy.f.resources')}
            </h2>
            <ResourcesManager assignmentId={a.id} files={a.resources} canEdit={canEdit} />
          </section>
          <section className="box" aria-labelledby="t-ext">
            <h2 id="t-ext" className="box-h">
              {t('academy.teacher.extensions')}
            </h2>
            <ExtensionsManager
              assignmentId={a.id}
              extensions={exts ?? []}
              roster={roster ?? []}
              canEdit={!readOnly && can('assignment.extend')}
              timezone={tz}
            />
          </section>
          {a.gradingType !== 'AUTOMATIC' ? (
            <section className="box" aria-labelledby="t-rub">
              <h2 id="t-rub" className="box-h">
                {t('academy.teacher.rubric')}
              </h2>
              <RubricEditor
                assignmentId={a.id}
                rubric={a.rubric}
                maxScore={a.maxScore}
                canEdit={canEdit}
              />
            </section>
          ) : null}
          {revisions?.length ? (
            <section className="box" aria-labelledby="t-rev">
              <h2 id="t-rev" className="box-h">
                {t('academy.teacher.revisions')}
              </h2>
              <ul className="flex flex-col gap-2 text-sm">
                {revisions.map((r) => (
                  <li key={r.version}>
                    <b>{t('academy.teacher.version', { n: r.version })}</b>
                    <span className="text-muted">
                      {' '}
                      · {fmtZoned(r.createdAt, { tz })}
                      {r.editedBy ? ` · ${r.editedBy.name}` : ''}
                    </span>
                    {r.reason ? <div className="text-muted">{r.reason}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
