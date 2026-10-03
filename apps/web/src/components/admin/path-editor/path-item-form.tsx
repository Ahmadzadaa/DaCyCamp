'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { AdminCourseDto, AdminPathDto, AdminPathItemDto, PathItemInput } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { QuizForm, type QuizValues } from '../course-editor/quiz-form';

/** Seçilmiş addımın forması — tipə görə sahələr; yadda saxla / sil */
export function PathItemForm({
  item,
  courses,
  onSaved,
  onDeleted,
}: {
  item: AdminPathItemDto;
  courses: AdminCourseDto[];
  onSaved: (p: AdminPathDto) => void;
  onDeleted: (p: AdminPathDto) => void;
}) {
  const [input, setInput] = useState<PathItemInput>(item.input);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<PathItemInput>) => setInput((x) => ({ ...x, ...p }) as PathItemInput);

  async function save() {
    setBusy(true);
    try {
      onSaved(
        await api<AdminPathDto>(`/admin/path-items/${item.id}`, { method: 'PUT', body: input }),
      );
      toast.success(t('admin.itemSaved'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setBusy(true);
    try {
      onDeleted(await api<AdminPathDto>(`/admin/path-items/${item.id}`, { method: 'DELETE' }));
      toast.success(t('admin.itemDeleted'));
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="path-item-form">
      {input.type === 'course' ? (
        <Field label={t('admin.pickCourse')} full>
          <Select
            value={input.course_slug}
            onChange={(e) => patch({ course_slug: e.target.value })}
          >
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title} {c.isPublished ? '' : '(qaralama)'}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label={t('common.title')} full>
          <Input value={input.title ?? ''} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
      )}
      <Field label={t('common.key')}>
        <Input
          value={input.key ?? item.key}
          className="font-mono"
          onChange={(e) => patch({ key: e.target.value })}
        />
      </Field>
      <Field label={t('admin.optionalItem')}>
        <Switch
          checked={input.optional}
          onCheckedChange={(v) => patch({ optional: v })}
          aria-label={t('admin.optionalItem')}
        />
      </Field>
      <Field label={t('admin.hours')}>
        <Input
          type="number"
          min={0}
          step="0.5"
          value={input.hours ?? ''}
          onChange={(e) => patch({ hours: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </Field>
      <Field label="XP">
        <Input
          type="number"
          min={0}
          value={input.xp}
          onChange={(e) => patch({ xp: Number(e.target.value) || 0 })}
        />
      </Field>

      {input.type === 'project' ? (
        <>
          <Field label={t('admin.instructions')} full>
            <Textarea
              value={input.config.instructions}
              onChange={(e) => patch({ config: { ...input.config, instructions: e.target.value } })}
              rows={6}
            />
          </Field>
          <Field label={t('paths.deliverables')} hint={t('admin.deliverablesHelp')} full>
            <Textarea
              value={input.config.deliverables.join('\n')}
              onChange={(e) =>
                patch({
                  config: {
                    ...input.config,
                    deliverables: e.target.value
                      .split('\n')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  },
                })
              }
              rows={3}
            />
          </Field>
          <Field label={t('admin.reviewMode')}>
            <Select
              value={input.config.review_mode}
              onChange={(e) =>
                patch({
                  config: { ...input.config, review_mode: e.target.value as 'manual' | 'auto' },
                })
              }
            >
              <option value="manual">{t('admin.reviewManual')}</option>
              <option value="auto">{t('admin.reviewAuto')}</option>
            </Select>
          </Field>
          <Field label={t('admin.maxFiles')}>
            <Input
              type="number"
              min={0}
              max={10}
              value={input.config.max_files}
              onChange={(e) =>
                patch({ config: { ...input.config, max_files: Number(e.target.value) || 0 } })
              }
            />
          </Field>
          <Field label={t('admin.allowLink')}>
            <Switch
              checked={input.config.allow_link}
              onCheckedChange={(v) => patch({ config: { ...input.config, allow_link: v } })}
              aria-label={t('admin.allowLink')}
            />
          </Field>
        </>
      ) : null}

      {input.type === 'assessment' ? (
        <div className="md:col-span-2">
          <QuizForm
            allowClassify={false}
            values={{
              pass_score: input.config.pass_score,
              shuffle_questions: false,
              questions: input.config.questions as QuizValues['questions'],
            }}
            onChange={(v) =>
              patch({
                config: {
                  pass_score: v.pass_score,
                  // allowClassify={false} — imtahanda yalnız variant sualları
                  questions: v.questions.map(({ buckets: _b, ...q }) => ({
                    ...q,
                    type: q.type === 'classify' ? 'single' : q.type,
                  })),
                },
              })
            }
          />
        </div>
      ) : null}

      {input.type === 'milestone' ? (
        <>
          <Field label={t('admin.certificateTitle')} full>
            <Input
              value={input.config.certificate_title}
              onChange={(e) =>
                patch({ config: { ...input.config, certificate_title: e.target.value } })
              }
            />
          </Field>
          <Field label={t('common.description')} full>
            <Textarea
              value={input.config.description}
              onChange={(e) => patch({ config: { ...input.config, description: e.target.value } })}
              rows={4}
            />
          </Field>
        </>
      ) : null}

      <div className="flex gap-2 md:col-span-2">
        <Button
          type="button"
          loading={busy}
          onClick={() => void save()}
          data-testid="path-item-save"
        >
          {t('common.save')}
        </Button>
        <Button type="button" variant="danger" disabled={busy} onClick={() => void remove()}>
          <Trash2 className="size-4" /> {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
