'use client';
import { useState } from 'react';
import Link from 'next/link';
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
  Trash2,
  Users,
} from 'lucide-react';
import {
  COURSE_TRASH_DAYS,
  type AdminCourseDto,
  type AdminCourseListDto,
  type CourseStatus,
  type TrackDto,
} from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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
import { fmtDate } from './format';

const TABS: Array<{ key: CourseStatus | 'all'; adminOnly?: boolean }> = [
  { key: 'all' },
  { key: 'published' },
  { key: 'draft' },
  { key: 'archived' },
  { key: 'deleted', adminOnly: true },
];

export function CoursesTable({
  data,
  tracks,
  track,
  q,
  status,
}: {
  data: AdminCourseListDto;
  tracks: TrackDto[];
  track?: string;
  q?: string;
  status?: CourseStatus;
}) {
  const { isAdmin } = useAdmin();
  const actions = useCourseActions();
  const [del, setDel] = useState<{ course: AdminCourseDto; mode: 'soft' | 'purge' } | null>(null);
  const trash = status === 'deleted';

  const href = (patch: { istiqamet?: string; q?: string; status?: string }) => {
    const p = new URLSearchParams();
    const merged = { istiqamet: track, q, status, ...patch };
    if (merged.istiqamet) p.set('istiqamet', merged.istiqamet);
    if (merged.q) p.set('q', merged.q);
    if (merged.status) p.set('status', merged.status);
    const s = p.toString();
    return `/admin/kurslar${s ? `?${s}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{trash ? t('courseAdmin.trash') : t('admin.courses')}</h1>
        <span className="flex-1" />
        <form action="/admin/kurslar" className="flex gap-2">
          {track ? <input type="hidden" name="istiqamet" value={track} /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            name="q"
            defaultValue={q}
            className="inp max-w-xs"
            placeholder={t('common.search')}
            aria-label={t('common.search')}
          />
        </form>
        <Link href="/admin/kurslar/yeni" className="b b-brand">
          <Plus className="size-4" />
          {t('admin.newCourse')}
        </Link>
      </div>

      <nav className="admin-tabs" aria-label={t('common.status')}>
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
              {tb.key === 'deleted' ? <Trash2 className="size-3.5" /> : null}
              {tb.key === 'deleted' ? t('courseAdmin.trash') : t(`courseAdmin.status.${tb.key}`)}
              <span className="count">{data.counts[tb.key]}</span>
            </Link>
          );
        })}
      </nav>

      {!trash ? (
        <nav className="flex flex-wrap gap-2" aria-label={t('common.track')}>
          <Link href={href({ istiqamet: undefined })} className={cn('chip', !track && 'on')}>
            {t('common.all')}
          </Link>
          {tracks.map((tr) => (
            <Link
              key={tr.slug}
              href={href({ istiqamet: track === tr.slug ? undefined : tr.slug })}
              className={cn('chip', track === tr.slug && 'on')}
            >
              {tr.title}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="text-sm text-muted">
          {t('courseAdmin.trashHint', { days: COURSE_TRASH_DAYS })}
        </p>
      )}

      {data.courses.length === 0 ? (
        <EmptyState
          icon={trash ? Trash2 : BookOpen}
          title={trash ? t('courseAdmin.trashEmpty') : t('admin.noCourses')}
          action={
            trash ? undefined : (
              <Link href="/admin/kurslar/yeni" className="b b-brand">
                {t('admin.newCourse')}
              </Link>
            )
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl-admin tbl-hover">
            <thead>
              <tr>
                <th>{t('common.title')}</th>
                <th>{t('common.track')}</th>
                <th>{t('common.level')}</th>
                <th>{t('common.status')}</th>
                <th>{t('admin.enrollments')}</th>
                <th>{trash ? t('courseAdmin.deletedAt') : t('common.date')}</th>
                <th className="text-right">{t('courseAdmin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c) => (
                <tr key={c.id} data-testid={`course-row-${c.slug}`}>
                  <td>
                    {trash ? (
                      <span className="font-semibold">{c.title}</span>
                    ) : (
                      <Link
                        href={`/admin/kurslar/${c.slug}`}
                        className="font-semibold hover:underline"
                      >
                        {c.title}
                      </Link>
                    )}
                    <div className="font-mono text-xs text-muted">{c.slug}</div>
                  </td>
                  <td>
                    <TrackBadge color={c.track.color}>{c.track.title}</TrackBadge>
                  </td>
                  <td>{t(`level.${c.level}`)}</td>
                  <td>
                    <CourseStatusBadge status={c.status} />
                  </td>
                  <td className="tabular-nums">{c.enrollmentCount}</td>
                  <td className="text-muted">
                    {trash ? (
                      <>
                        {fmtDate(c.deletedAt ?? c.updatedAt)}
                        <div className="text-xs">
                          {daysLeft(c.purgeAt)
                            ? t('courseAdmin.purgeIn', { days: daysLeft(c.purgeAt)! })
                            : t('courseAdmin.purgeSoon')}
                        </div>
                      </>
                    ) : (
                      fmtDate(c.updatedAt)
                    )}
                  </td>
                  <td>
                    {trash ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="b b-ghost b-sm"
                          onClick={() => actions.restore(c)}
                          disabled={!!actions.busy}
                        >
                          <RotateCcw className="size-4" />
                          {t('courseAdmin.restore')}
                        </button>
                        <button
                          type="button"
                          className="b b-danger b-sm"
                          onClick={() => setDel({ course: c, mode: 'purge' })}
                        >
                          <Trash2 className="size-4" />
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
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/kurslar/${c.slug}`}
        className="iconbtn"
        aria-label={t('courseAdmin.edit')}
        title={t('courseAdmin.edit')}
      >
        <Pencil className="size-4" />
      </Link>
      <a
        href={`/kurs/${c.slug}`}
        target="_blank"
        rel="noreferrer"
        className="iconbtn"
        aria-label={t('courseAdmin.preview')}
        title={t('courseAdmin.preview')}
      >
        <Eye className="size-4" />
      </a>
      {isAdmin ? (
        <button
          type="button"
          className="iconbtn danger"
          onClick={onDelete}
          aria-label={t('courseAdmin.delete')}
          title={t('courseAdmin.delete')}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      <Dropdown>
        <DropdownTrigger
          className="iconbtn"
          aria-label={t('courseAdmin.more')}
          title={t('courseAdmin.more')}
          data-testid={`more-${c.slug}`}
        >
          <MoreHorizontal className="size-4" />
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem asChild>
            <Link href={`/admin/kurslar/${c.slug}`}>
              <Pencil className="size-4" /> {t('courseAdmin.edit')}
            </Link>
          </DropdownItem>
          <DropdownItem onSelect={() => actions.setPublished(c, !c.isPublished)}>
            {c.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {c.isPublished ? t('courseAdmin.unpublish') : t('courseAdmin.publish')}
          </DropdownItem>
          {isAdmin ? (
            <>
              <DropdownItem onSelect={() => actions.setArchived(c, !archived)}>
                {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {archived ? t('courseAdmin.unarchive') : t('courseAdmin.archive')}
              </DropdownItem>
              <DropdownItem onSelect={() => actions.copy(c)}>
                <Copy className="size-4" /> {t('courseAdmin.copy')}
              </DropdownItem>
            </>
          ) : null}
          <DropdownItem asChild>
            <a href={`/kurs/${c.slug}`} target="_blank" rel="noreferrer">
              <Eye className="size-4" /> {t('courseAdmin.preview')}
            </a>
          </DropdownItem>
          {isAdmin ? (
            <>
              <DropdownItem asChild>
                <Link href={`/admin/kurslar/${c.slug}?tab=telebeler`}>
                  <Users className="size-4" /> {t('courseAdmin.students')}
                </Link>
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem className="text-error" onSelect={onDelete}>
                <Trash2 className="size-4" /> {t('courseAdmin.delete')}
              </DropdownItem>
            </>
          ) : null}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}
