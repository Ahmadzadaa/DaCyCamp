'use client';
import { t } from '@/lib/i18n';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';

export type EnDraft = { title: string; description: string };

export const enDraftOf = (en?: { title?: string; description?: string } | null): EnDraft => ({
  title: en?.title ?? '',
  description: en?.description ?? '',
});

/** Formadan API-yə: boş sahə göndərilmir (tərcümə yoxdur — AZ mətn göstərilir) */
export const enPayload = (d: EnDraft) => ({
  title: d.title.trim() || undefined,
  description: d.description.trim() || undefined,
});

/** Admin formalarında İngiliscə variant: başlıq + təsvir (bazada `i18n.en`) */
export function EnFields({
  value,
  onChange,
  titleMax = 120,
  descriptionMax = 1000,
}: {
  value: EnDraft;
  onChange: (v: EnDraft) => void;
  titleMax?: number;
  descriptionMax?: number;
}) {
  return (
    <fieldset className="en-fields md:col-span-2" data-testid="en-fields">
      <legend>{t('admin.enSection')}</legend>
      <p className="en-fields-hint">{t('admin.enSectionHint')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('admin.enTitle')}>
          <Input
            lang="en"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            maxLength={titleMax}
          />
        </Field>
        <Field label={t('admin.enDescription')} full>
          <Textarea
            lang="en"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            rows={2}
            maxLength={descriptionMax}
          />
        </Field>
      </div>
    </fieldset>
  );
}
