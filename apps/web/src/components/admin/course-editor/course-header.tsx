'use client';
import { useEffect, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  History,
  Layers,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import { COURSE_TRASH_DAYS, type AdminCourseDto, type AdminCourseStatsDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TrackBadge } from '@/components/app/track-badge';
import { useAdmin } from '../admin-context';
import {
  CourseDeleteDialog,
  CourseStatusBadge,
  daysLeft,
  useCourseActions,
} from '../course-actions';

export type CourseTab = 'content' | 'students' | 'files' | 'history';
export const TAB_PARAM: Record<CourseTab, string> = {
  content: 'mezmun',
  students: 'telebeler',
  files: 'fayllar',
  history: 'tarixce',
};
export const parseTab = (v?: string | null): CourseTab =>
  (Object.entries(TAB_PARAM).find(([, p]) => p === v)?.[0] as CourseTab | undefined) ?? 'content';

/** Kurs redaktorunun başlığı: vəziyyət, statistika, kurs səviyyəsində əməliyyatlar və tablar */
export function CourseHeader({
  course,
  onChange,
  tab,
  onTab,
}: {
  course: AdminCourseDto;
  onChange: (c: AdminCourseDto) => void;
  tab: CourseTab;
  onTab: (t: CourseTab) => void;
}) {
  const { isAdmin } = useAdmin();
  const [stats, setStats] = useState<AdminCourseStatsDto | null>(null);
  const [del, setDel] = useState<'soft' | 'purge' | null>(null);
  const actions = useCourseActions((c) => c && onChange(c));
  const deleted = course.status === 'deleted';
  const archived = course.status === 'archived';

  useEffect(() => {
    api<AdminCourseStatsDto>(`/admin/courses/${course.id}/stats`)
      .then(setStats)
      .catch(() => null);
  }, [course.id, course.updatedAt]);

  const tabs: Array<{ key: CourseTab; icon: typeof Layers; adminOnly?: boolean; count?: number }> =
    [
      { key: 'content', icon: Layers },
      { key: 'students', icon: Users, adminOnly: true, count: stats?.enrollments },
      { key: 'files', icon: FolderOpen, count: stats?.assets },
      { key: 'history', icon: History, adminOnly: true },
    ];

  return (
    <div className="flex flex-col gap-4">
      {deleted ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm"
        >
          <Trash2 className="size-4 text-error" />
          <span className="flex-1">
            {t('courseAdmin.trashHint', { days: COURSE_TRASH_DAYS })}{' '}
            <b>
              {daysLeft(course.purgeAt)
                ? t('courseAdmin.purgeIn', { days: daysLeft(course.purgeAt)! })
                : t('courseAdmin.purgeSoon')}
            </b>
          </span>
          {isAdmin ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={actions.busy === 'restore'}
                onClick={() => actions.restore(course)}
              >
                <RotateCcw className="size-4" />
                {t('courseAdmin.restore')}
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={() => setDel('purge')}>
                <Trash2 className="size-4" />
                {t('courseAdmin.purge')}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TrackBadge color={course.track.color}>{course.track.title}</TrackBadge>
            <CourseStatusBadge status={course.status} />
          </div>
          <h1 className="mt-2 text-[1.7rem] leading-tight">{course.title}</h1>
          {stats ? (
            <p className="mt-1 text-sm text-muted" data-testid="course-stats">
              {t('courseAdmin.studentsCount', { n: stats.enrollments })} · {t('common.completed')}:{' '}
              {stats.completed} · {stats.modules}{' '}
              {t('courseAdmin.statModules', { n: stats.modules })} · {stats.steps}{' '}
              {t('courseAdmin.statSteps', { n: stats.steps })}
            </p>
          ) : null}
        </div>
        {!deleted ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost">
              <a href={`/kurs/${course.slug}`} target="_blank" rel="noreferrer">
                <Eye className="size-4" />
                {t('courseAdmin.preview')}
              </a>
            </Button>
            <Button asChild variant="ghost">
              <a href={`/api/admin/courses/${course.id}/export.zip`} download>
                <Download className="size-4" />
                {t('admin.exportZip')}
              </a>
            </Button>
            {isAdmin ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  loading={actions.busy === 'copy'}
                  onClick={() => actions.copy(course)}
                >
                  <Copy className="size-4" />
                  {t('courseAdmin.copy')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  loading={actions.busy === 'archive'}
                  onClick={() => actions.setArchived(course, !archived)}
                >
                  {archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                  {archived ? t('courseAdmin.unarchive') : t('courseAdmin.archive')}
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant={course.isPublished ? 'dark' : 'brand'}
              loading={actions.busy === 'publish'}
              onClick={() => actions.setPublished(course, !course.isPublished)}
            >
              {course.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {course.isPublished
                ? t('courseAdmin.unpublishCourse')
                : t('courseAdmin.publishCourse')}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setDel('soft')}
                aria-label={t('courseAdmin.delete')}
                title={t('courseAdmin.delete')}
              >
                <Trash2 className="size-4" />
                <span className="sr-only md:not-sr-only">{t('courseAdmin.delete')}</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav className="admin-tabs" role="tablist" aria-label={t('courseAdmin.actions')}>
        {tabs
          .filter((tb) => !tb.adminOnly || isAdmin)
          .map((tb) => (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={tab === tb.key}
              className={cn(tab === tb.key && 'on')}
              onClick={() => onTab(tb.key)}
              data-testid={`course-tab-${tb.key}`}
            >
              <tb.icon className="size-4" />
              {t(`courseAdmin.tabs.${tb.key}`)}
              {tb.count !== undefined ? <span className="count">{tb.count}</span> : null}
            </button>
          ))}
      </nav>

      <CourseDeleteDialog
        course={course}
        mode={del ?? 'soft'}
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        onConfirm={async (c, typed) => {
          if (del === 'purge') await actions.purge(c, typed, '/admin/kurslar?status=deleted');
          else await actions.softDelete(c, typed, '/admin/kurslar');
        }}
      />
    </div>
  );
}
