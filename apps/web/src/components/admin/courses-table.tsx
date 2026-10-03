'use client';
import { useState } from 'react';
import { useLevelLabels } from '@/components/level-labels';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  COURSE_TRASH_DAYS,
  LEVELS,
  type AdminCourseDto,
  type AdminCourseListDto,
  type CourseStatus,
  type Level,
  type TopicDto,
  type TrackDto,
} from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn, fmtNum } from '@/lib/utils';
import { TrackBadge } from '@/components/app/track-badge';
import { EmptyState } from '@/components/app/empty-state';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown';
import { useAdmin } from './admin-context';
import {
  CourseDeleteDialog,
  CourseStatusBadge,
  daysLeft,
  useCourseActions,
} from './course-actions';
import { fmtAgo, fmtDate } from './format';

const TABS: Array<{ key: CourseStatus | 'all'; adminOnly?: boolean }> = [
  { key: 'all' },
  { key: 'published' },
  { key: 'draft' },
  { key: 'archived' },
  { key: 'deleted', adminOnly: true },
];

/** Admin «Kurslar»: başlıq + xülasə, status tabları, istiqamət çipləri, cədvəl, sətir əməliyyatları */
export function CoursesTable({
  data,
  tracks,
  topics = [],
  track,
  q,
  status,
  topic,
  level,
}: {
  data: AdminCourseListDto;
  tracks: TrackDto[];
  topics?: TopicDto[];
  track?: string;
  q?: string;
  status?: CourseStatus;
  topic?: string;
  level?: Level;
}) {
  const levels = useLevelLabels();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const actions = useCourseActions();
  const [del, setDel] = useState<{ course: AdminCourseDto; mode: 'soft' | 'purge' } | null>(null);
  const [query, setQuery] = useState(q ?? '');
  const trash = status === 'deleted';

  const href = (patch: {
    istiqamet?: string;
    q?: string;
    status?: string;
    movzu?: string;
    seviyye?: string;
  }) => {
    const p = new URLSearchParams();
    const merged = { istiqamet: track, q, status, movzu: topic, seviyye: level, ...patch };
    if (merged.istiqamet) p.set('istiqamet', merged.istiqamet);
    if (merged.q) p.set('q', merged.q);
    if (merged.status) p.set('status', merged.status);
    if (merged.movzu) p.set('movzu', merged.movzu);
    if (merged.seviyye) p.set('seviyye', merged.seviyye);
    const s = p.toString();
    return `/admin/kurslar${s ? `?${s}` : ''}`;
  };

  const summary = [
    t('courseAdmin.sumCourses', { n: fmtNum(data.counts.all) }),
    data.totals ? t('courseAdmin.sumTracks', { n: data.totals.tracks }) : null,
    data.totals ? t('courseAdmin.sumEnrollments', { n: fmtNum(data.totals.enrollments) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col">
      <div className="ph1">
        <div>
          <h1>{trash ? t('courseAdmin.trash') : t('admin.courses')}</h1>
          <p>{trash ? t('courseAdmin.trashHint', { days: COURSE_TRASH_DAYS }) : summary}</p>
        </div>
        <div className="ph1-act">
          <Link href="/admin/idxal" className="b b-ghost">
            <Upload aria-hidden />
            {t('nav.import')}
          </Link>
          <Link href="/admin/kurslar/yeni" className="b b-brand">
            <Plus aria-hidden />
            {t('admin.newCourse')}
          </Link>
        </div>
      </div>

      <nav className="tabs" aria-label={t('common.status')}>
        {TABS.filter((tb) => !tb.adminOnly || isAdmin).map((tb) => {
          const on = (status ?? 'all') === tb.key;
          return (
            <Link
              key={tb.key}
              href={href({ status: tb.key === 'all' ? undefined : tb.key })}
              className={cn(on && 'on')}
              aria-current={on ? 'page' : undefined}
              data-testid={`tab-${tb.key}`}
            >
              {tb.key === 'deleted' ? <Trash2 aria-hidden /> : null}
              {tb.key === 'deleted' ? t('courseAdmin.trash') : t(`courseAdmin.status.${tb.key}`)}
              <i>{data.counts[tb.key]}</i>
            </Link>
          );
        })}
      </nav>

      <div className="tb !mt-0">
        {!trash ? (
          <nav className="chips scroll-m" aria-label={t('common.track')}>
            <Link href={href({ istiqamet: undefined })} className={cn('chip', !track && 'on')}>
              {t('common.all')}
            </Link>
            {tracks.map((tr) => (
              <Link
                key={tr.slug}
                href={href({ istiqamet: track === tr.slug ? undefined : tr.slug })}
                className={cn('chip', track === tr.slug && 'on')}
                style={{ ['--c' as string]: tr.color }}
              >
                <span className="cdot" aria-hidden />
                {tr.title}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 max-md:ml-0 max-md:justify-start">
          {!trash ? (
            <>
              <select
                className="sel"
                value={topic ?? ''}
                onChange={(e) => router.push(href({ movzu: e.target.value || undefined }))}
                aria-label={t('topics.title')}
                data-testid="filter-topic"
              >
                <option value="">{t('topics.filterAll')}</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.slug}>
                    {tp.title}
                  </option>
                ))}
              </select>
              <select
                className="sel"
                value={level ?? ''}
                onChange={(e) => router.push(href({ seviyye: e.target.value || undefined }))}
                aria-label={t('topics.level')}
                data-testid="filter-level"
              >
                <option value="">{t('topics.levelAll')}</option>
                {LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {levels[lv]}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <form
            className="srch"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(href({ q: query.trim() || undefined }));
            }}
          >
            <Search aria-hidden className="size-[18px] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('courseAdmin.searchCourses')}
              aria-label={t('courseAdmin.searchCourses')}
              type="search"
            />
          </form>
        </div>
      </div>

      {data.courses.length === 0 ? (
        <EmptyState
          icon={trash ? Trash2 : BookOpen}
          title={trash ? t('courseAdmin.trashEmpty') : t('admin.noCourses')}
          action={
            trash ? undefined : (
              <Link href="/admin/kurslar/yeni" className="b b-brand">
                <Plus aria-hidden />
                {t('admin.newCourse')}
              </Link>
            )
          }
        />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl-admin">
            <thead>
              <tr>
                <th>{t('courseAdmin.colCourse')}</th>
                <th>{t('common.track')}</th>
                <th>{t('common.level')}</th>
                <th>{t('common.status')}</th>
                <th>{t('courseAdmin.colStudents')}</th>
                <th>{trash ? t('courseAdmin.deletedAt') : t('courseAdmin.colUpdated')}</th>
                <th className="text-right">{t('courseAdmin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`course-row-${c.slug}`}
                  className={cn(c.status === 'archived' && 'dim')}
                >
                  <td>
                    {trash ? (
                      <span className="ttl">{c.title}</span>
                    ) : (
                      <Link href={`/admin/kurslar/${c.slug}`} className="ttl hover:underline">
                        {c.title}
                      </Link>
                    )}
                    <div className="slug flex flex-wrap items-center gap-x-2">
                      {c.slug}
                      {c.topics.map((tp) => (
                        <span key={tp.id} className="tdot" style={{ ['--c' as string]: tp.color }}>
                          {tp.title}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <TrackBadge color={c.track.color}>{c.track.title}</TrackBadge>
                  </td>
                  <td>{levels[c.level]}</td>
                  <td>
                    <CourseStatusBadge status={c.status} />
                  </td>
                  <td className="tabular-nums">{fmtNum(c.enrollmentCount)}</td>
                  <td className="dt">
                    {trash ? (
                      <>
                        {fmtDate(c.deletedAt ?? c.updatedAt)}
                        <div className="text-xs text-muted">
                          {daysLeft(c.purgeAt)
                            ? t('courseAdmin.purgeIn', { days: daysLeft(c.purgeAt)! })
                            : t('courseAdmin.purgeSoon')}
                        </div>
                      </>
                    ) : (
                      <span title={fmtDate(c.updatedAt, true)} suppressHydrationWarning>
                        {fmtAgo(c.updatedAt)}
                      </span>
                    )}
                  </td>
                  <td>
                    {trash ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="b b-ghost b-sm"
                          onClick={() => actions.restore(c)}
                          disabled={!!actions.busy}
                        >
                          <RotateCcw aria-hidden />
                          {t('courseAdmin.restore')}
                        </button>
                        <button
                          type="button"
                          className="b b-danger b-sm"
                          onClick={() => setDel({ course: c, mode: 'purge' })}
                        >
                          <Trash2 aria-hidden />
                          {t('courseAdmin.purge')}
                        </button>
                      </div>
                    ) : (
                      <RowActions
                        course={c}
                        isAdmin={isAdmin}
                        actions={actions}
                        onDelete={() => setDel({ course: c, mode: 'soft' })}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CourseDeleteDialog
        course={del?.course ?? null}
        mode={del?.mode ?? 'soft'}
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        onConfirm={(c, typed) =>
          del?.mode === 'purge' ? actions.purge(c, typed) : actions.softDelete(c, typed)
        }
      />
    </div>
  );
}

function RowActions({
  course: c,
  isAdmin,
  actions,
  onDelete,
}: {
  course: AdminCourseDto;
  isAdmin: boolean;
  actions: ReturnType<typeof useCourseActions>;
  onDelete: () => void;
}) {
  const archived = c.status === 'archived';
  return (
    <div className="acts">
      <Link
        href={`/admin/kurslar/${c.slug}`}
        className="ib"
        aria-label={t('courseAdmin.edit')}
        title={t('courseAdmin.edit')}
      >
        <Pencil aria-hidden />
      </Link>
      <a
        href={`/kurs/${c.slug}`}
        target="_blank"
        rel="noreferrer"
        className="ib"
        aria-label={t('courseAdmin.preview')}
        title={t('courseAdmin.preview')}
      >
        <Eye aria-hidden />
      </a>
      {isAdmin ? (
        <button
          type="button"
          className="ib danger"
          onClick={onDelete}
          aria-label={t('courseAdmin.delete')}
          title={t('courseAdmin.delete')}
        >
          <Trash2 aria-hidden />
        </button>
      ) : null}
      <Dropdown>
        <DropdownTrigger
          className="ib more"
          aria-label={t('courseAdmin.more')}
          title={t('courseAdmin.more')}
          data-testid={`more-${c.slug}`}
        >
          <MoreHorizontal aria-hidden />
        </DropdownTrigger>
        <DropdownContent className="min-w-56">
          <DropdownItem asChild>
            <Link href={`/admin/kurslar/${c.slug}`}>
              <Pencil aria-hidden /> {t('courseAdmin.edit')}
            </Link>
          </DropdownItem>
          <DropdownItem onSelect={() => actions.setPublished(c, !c.isPublished)}>
            {c.isPublished ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {c.isPublished ? t('courseAdmin.unpublish') : t('courseAdmin.publish')}
          </DropdownItem>
          {isAdmin ? (
            <>
              <DropdownItem onSelect={() => actions.setArchived(c, !archived)}>
                {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {archived ? t('courseAdmin.unarchive') : t('courseAdmin.archive')}
              </DropdownItem>
              <DropdownItem onSelect={() => actions.copy(c)}>
                <Copy aria-hidden /> {t('courseAdmin.copy')}
              </DropdownItem>
            </>
          ) : null}
          <DropdownItem asChild>
            <a href={`/kurs/${c.slug}`} target="_blank" rel="noreferrer">
              <Eye aria-hidden /> {t('courseAdmin.preview')}
            </a>
          </DropdownItem>
          {isAdmin ? (
            <>
              <DropdownItem asChild>
                <Link href={`/admin/kurslar/${c.slug}?tab=telebeler`}>
                  <Users aria-hidden /> {t('courseAdmin.students')}
                </Link>
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem className="danger" onSelect={onDelete}>
                <Trash2 aria-hidden /> {t('courseAdmin.delete')}
              </DropdownItem>
            </>
          ) : null}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}
