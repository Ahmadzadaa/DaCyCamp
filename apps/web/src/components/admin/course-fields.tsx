'use client';
import { useRef } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { LEVELS, createCourseSchema, slugify, type TrackDto } from '@dacy/shared';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { t } from '@/lib/i18n';
import { Seg } from './seg';

const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : (v as string | null | undefined);

export type CourseFormInput = z.input<typeof createCourseSchema>;
export type CourseFormOutput = z.output<typeof createCourseSchema>;
export type CourseForm = UseFormReturn<CourseFormInput, unknown, CourseFormOutput>;

/** Yeni kurs və kurs ayarları formalarının ortaq sahələri (2 sütunlu grid-in içində işlənir) */
export function CourseFields({
  form,
  tracks,
  autoSlug,
}: {
  form: CourseForm;
  tracks: TrackDto[];
  autoSlug?: boolean;
}) {
  const { register, control, setValue, formState } = form;
  const errors = formState.errors;
  const slugTouched = useRef(false);
  const titleReg = register('title');
  const slugReg = register('slug');

  return (
    <>
      <Field label={t('common.title')} error={errors.title?.message}>
        <Input
          {...titleReg}
          invalid={!!errors.title}
          onChange={(e) => {
            void titleReg.onChange(e);
            if (autoSlug && !slugTouched.current)
              setValue('slug', slugify(e.target.value), { shouldValidate: formState.isSubmitted });
          }}
        />
      </Field>
      <Field label={t('common.slug')} error={errors.slug?.message}>
        <Input
          {...slugReg}
          className="font-mono"
          invalid={!!errors.slug}
          onChange={(e) => {
            slugTouched.current = e.target.value.length > 0;
            void slugReg.onChange(e);
          }}
        />
      </Field>
      <Field label={t('common.track')} error={errors.trackId?.message}>
        <Select {...register('trackId')}>
          {tracks.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('common.level')} error={errors.level?.message}>
        <Controller
          control={control}
          name="level"
          render={({ field }) => (
            <Seg
              value={field.value ?? 'BEGINNER'}
              onChange={field.onChange}
              label={t('common.level')}
              options={LEVELS.map((lv) => ({ value: lv, label: t(`level.${lv}`) }))}
            />
          )}
        />
      </Field>
      <Field label={t('common.description')} error={errors.description?.message} full>
        <Textarea {...register('description')} rows={4} invalid={!!errors.description} />
      </Field>
      <Field label={t('common.sequential')} hint={t('common.sequentialHint')}>
        <Controller
          control={control}
          name="sequential"
          render={({ field }) => (
            <label className="flex items-center gap-3 py-1 text-sm font-normal">
              <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              <span>{(field.value ?? true) ? t('common.sequential') : t('common.free')}</span>
            </label>
          )}
        />
      </Field>
      <Field label={t('common.estimatedHours')} error={errors.estimatedHours?.message}>
        <Input
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          invalid={!!errors.estimatedHours}
          {...register('estimatedHours', {
            setValueAs: (v: unknown) =>
              v === '' || v === null || v === undefined ? null : Number(v),
          })}
        />
      </Field>
      <Field label={t('courseAdmin.instructorName')} error={errors.instructorName?.message}>
        <Input
          {...register('instructorName', { setValueAs: emptyToNull })}
          autoComplete="off"
          invalid={!!errors.instructorName}
        />
      </Field>
      <Field label={t('courseAdmin.instructorTitle')} error={errors.instructorTitle?.message}>
        <Input
          {...register('instructorTitle', { setValueAs: emptyToNull })}
          placeholder={t('courseAdmin.instructorTitlePh')}
          autoComplete="off"
          invalid={!!errors.instructorTitle}
        />
      </Field>
    </>
  );
}
