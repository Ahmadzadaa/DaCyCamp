'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createCourseSchema, type AdminCourseDto, type TrackDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { CourseFields, type CourseFormInput, type CourseFormOutput } from './course-fields';

export function NewCourseForm({ tracks }: { tracks: TrackDto[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      trackId: tracks[0]?.id ?? '',
      slug: '',
      title: '',
      level: 'BEGINNER',
      description: '',
      sequential: true,
      estimatedHours: null,
    },
  });

  async function onSubmit(values: CourseFormOutput) {
    setError(null);
    try {
      const c = await api<AdminCourseDto>('/admin/courses', { method: 'POST', body: values });
      toast.success(t('admin.created'));
      router.push(`/admin/kurslar/${c.slug}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="box grid gap-4 md:grid-cols-2"
      noValidate
    >
      {tracks.length === 0 ? (
        <p className="text-sm text-error md:col-span-2">
          {t('admin.noTracks')}{' '}
          <Link href="/admin/istiqametler" className="underline">
            {t('admin.newTrack')}
          </Link>
        </p>
      ) : null}
      <CourseFields form={form} tracks={tracks} autoSlug />
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error md:col-span-2"
        >
          {error}
        </div>
      ) : null}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Link href="/admin/kurslar" className="b b-ghost">
          {t('common.cancel')}
        </Link>
        <Button type="submit" loading={form.formState.isSubmitting} disabled={tracks.length === 0}>
          {t('common.create')}
        </Button>
      </div>
    </form>
  );
}
