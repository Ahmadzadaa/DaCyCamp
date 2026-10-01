'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, Trash2 } from 'lucide-react';
import {
  createCourseSchema,
  type AdminCourseDto,
  type AssetDto,
  type TrackDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { TrackBadge } from '@/components/app/track-badge';
import { CourseFields, type CourseFormInput, type CourseFormOutput } from '../course-fields';
import { ConfirmDialog } from '../confirm-dialog';
import { StatusBadge } from '../status-badge';
import { useAdmin } from '../admin-context';
import { uploadAsset } from '../upload';

interface Stats {
  enrollments: number;
  completed: number;
  progressRows: number;
  assets: number;
  pathItems: number;
}

export function CourseForm({
  course,
  tracks,
  onChange,
  onAssetUploaded,
  onDeleted,
}: {
  course: AdminCourseDto;
  tracks: TrackDto[];
  onChange: (c: AdminCourseDto) => void;
  onAssetUploaded: (a: AssetDto) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      trackId: course.trackId,
      slug: course.slug,
      title: course.title,
      level: course.level,
      description: course.description,
      sequential: course.sequential,
      estimatedHours: course.estimatedHours,
    },
  });

  useEffect(() => {
    api<Stats>(`/admin/courses/${course.id}/stats`)
      .then(setStats)
      .catch(() => null);
  }, [course.id]);

  async function save(values: CourseFormOutput) {
    try {
      const updated = await api<AdminCourseDto>(`/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: values,
      });
      onChange(updated);
      toast.success(t('admin.courseSaved'));
      if (updated.slug !== course.slug)
        router.replace(`/admin/kurslar/${updated.slug}?node=course`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function togglePublish() {
    setBusy('publish');
    try {
      const updated = await api<AdminCourseDto>(`/admin/courses/${course.id}/publish`, {
        method: 'PATCH',
        body: { isPublished: !course.isPublished },
      });
      onChange(updated);
      toast.success(updated.isPublished ? t('admin.publishedOk') : t('admin.unpublishedOk'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('cover');
    try {
      const asset = await uploadAsset(course.id, file, 'IMAGE', {
        path: `images/${file.name}`,
        replace: true,
      });
      onAssetUploaded(asset);
      const updated = await api<AdminCourseDto>(`/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: { coverAssetId: asset.id },
      });
      onChange(updated);
      toast.success(t('admin.assetUploaded', { path: asset.path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setDelError(null);
    try {
      await api(`/admin/courses/${course.id}?confirm=${encodeURIComponent(course.slug)}`, {
        method: 'DELETE',
      });
      toast.success(t('admin.deleted'));
      setDelOpen(false);
      onDeleted();
    } catch (e) {
      setDelError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TrackBadge color={course.track.color}>{course.track.title}</TrackBadge>
            <StatusBadge published={course.isPublished} />
          </div>
          <h2 className="mt-1.5 text-[1.3rem]">{course.title}</h2>
          {stats ? (
            <p className="mt-1 text-xs text-muted">
              {t('admin.studentsCount', { n: stats.enrollments })} · {t('common.completed')}:{' '}
              {stats.completed} · {t('nav.files')}: {stats.assets}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.open(`/kurs/${course.slug}`, '_blank')}
          >
            <Eye className="size-4" />
            {t('common.previewAsStudent')}
          </Button>
          <Button
            type="button"
            variant={course.isPublished ? 'dark' : 'brand'}
            loading={busy === 'publish'}
            onClick={togglePublish}
          >
            {course.isPublished ? t('common.unpublish') : t('common.publish')}
          </Button>
          {isAdmin ? (
            <Button type="button" variant="danger" onClick={() => setDelOpen(true)}>
              <Trash2 className="size-4" />
              {t('common.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(save)} className="grid gap-4 md:grid-cols-2" noValidate>
        <CourseFields form={form} tracks={tracks} />
        <Field label={t('common.cover')} full>
          <div className="flex flex-wrap items-center gap-3">
            {course.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverUrl}
                alt=""
                className="h-16 w-28 rounded-lg border border-line object-cover"
              />
            ) : (
              <span className="grid h-16 w-28 place-items-center rounded-lg border border-dashed border-line text-xs text-muted">
                —
              </span>
            )}
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onCover}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy === 'cover'}
              onClick={() => coverInput.current?.click()}
            >
              {t('common.upload')}
            </Button>
          </div>
        </Field>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={t('admin.deleteCourse')}
        description={t('admin.deleteCourseDesc')}
        confirmText={course.slug}
        onConfirm={remove}
        error={delError}
      />
    </div>
  );
}
