'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserRound } from 'lucide-react';
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
import { CourseFields, type CourseFormInput, type CourseFormOutput } from '../course-fields';
import { uploadAsset } from '../upload';
import { TopicPicker } from './topic-picker';

/** Kurs ayarları (başlıq, təsvir, istiqamət, səviyyə, müəllim, müddət, örtük və müəllim şəkli) */
export function CourseForm({
  course,
  tracks,
  onChange,
  onAssetUploaded,
}: {
  course: AdminCourseDto;
  tracks: TrackDto[];
  onChange: (c: AdminCourseDto) => void;
  onAssetUploaded: (a: AssetDto) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [topicIds, setTopicIds] = useState<string[]>(course.topics.map((x) => x.id));
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
      instructorName: course.instructorName,
      instructorTitle: course.instructorTitle,
    },
  });

  async function save(values: CourseFormOutput) {
    try {
      const updated = await api<AdminCourseDto>(`/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: { ...values, topicIds },
      });
      onChange(updated);
      toast.success(t('admin.courseSaved'));
      if (updated.slug !== course.slug)
        router.replace(`/admin/kurslar/${updated.slug}?node=course`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  /** Şəkli kursun fayllarına yükləyir və kursun müvafiq sahəsinə bağlayır */
  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'coverAssetId' | 'instructorAvatarId',
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(field);
    try {
      const asset = await uploadAsset(course.id, file, 'IMAGE', {
        path: `images/${field === 'instructorAvatarId' ? 'muellim-' : ''}${file.name}`,
        replace: true,
      });
      onAssetUploaded(asset);
      const updated = await api<AdminCourseDto>(`/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: { [field]: asset.id },
      });
      onChange(updated);
      toast.success(t('admin.assetUploaded', { path: asset.path }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[1.15rem]">{t('admin.courseSettings')}</h2>
      <form onSubmit={form.handleSubmit(save)} className="grid gap-4 md:grid-cols-2" noValidate>
        <CourseFields form={form} tracks={tracks} />
        <Field label={t('topics.courseField')} hint={t('topics.courseFieldHint')} full htmlFor="-">
          <TopicPicker value={topicIds} onChange={setTopicIds} />
        </Field>
        <Field label={t('courseAdmin.instructorAvatar')}>
          <div className="flex flex-wrap items-center gap-3">
            {course.instructorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.instructorAvatarUrl}
                alt=""
                className="size-12 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="grid size-12 place-items-center rounded-full border border-dashed border-line text-muted">
                <UserRound className="size-5" />
              </span>
            )}
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadImage(e, 'instructorAvatarId')}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy === 'instructorAvatarId'}
              onClick={() => avatarInput.current?.click()}
            >
              {t('common.upload')}
            </Button>
          </div>
        </Field>
        <Field label={t('common.cover')}>
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
              onChange={(e) => uploadImage(e, 'coverAssetId')}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy === 'coverAssetId'}
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
    </div>
  );
}
