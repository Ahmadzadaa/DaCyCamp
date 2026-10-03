'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { STEP_TYPES, type AdminStepDto, type AdminStepNode, type StepType } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { stepLucide } from '@/components/app/step-icon';
import { stepNodeOf } from './types';

/**
 * Yeni addım: tip kartları (ikon + qısa izah), başlıq və «nümunə məzmunla doldur» —
 * açıqdırsa addım boş yox, işlək nümunə ilə yaranır (təlimat, başlanğıc kod, həll, testlər).
 */
export function AddStepDialog({
  moduleId,
  onOpenChange,
  onCreated,
}: {
  moduleId: string | null;
  onOpenChange: (o: boolean) => void;
  onCreated: (moduleId: string, s: AdminStepNode) => void;
}) {
  const [type, setType] = useState<StepType>('THEORY');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleId) return;
    if (!title.trim()) {
      setError(t('admin.stepTitleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dto = await api<AdminStepDto>(`/admin/modules/${moduleId}/steps`, {
        method: 'POST',
        body: { type, title: title.trim(), template },
      });
      onCreated(moduleId, stepNodeOf(dto));
      toast.success(t('admin.created'));
      setTitle('');
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={moduleId !== null}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent title={t('admin.newStep')} icon={<Plus />} className="max-w-[640px]">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="fld">
            <span className="lbl">{t('admin.stepType')}</span>
            <div className="stp-types" role="radiogroup" aria-label={t('admin.stepType')}>
              {STEP_TYPES.map((x) => {
                const Icon = stepLucide(x);
                const on = x === type;
                return (
                  <button
                    key={x}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={cn('stp-type', on && 'on')}
                    onClick={() => setType(x)}
                    data-testid={`step-type-${x}`}
                  >
                    <Icon aria-hidden />
                    <b>{t(`stepTypeShort.${x}`)}</b>
                    <small>{t(`admin.stepTypeDesc.${x}`)}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="fld">
            <span className="lbl">{t('common.title')}</span>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('admin.stepTitlePh')}
              autoFocus
              maxLength={200}
              invalid={!!error && !title.trim()}
              data-testid="step-title"
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-soft px-4 py-3">
            <Switch
              checked={template}
              onCheckedChange={setTemplate}
              className="mt-0.5"
              data-testid="step-template"
            />
            <span>
              <b className="block text-sm">{t('admin.stepTemplate')}</b>
              <span className="text-xs text-muted">{t('admin.stepTemplateHint')}</span>
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" loading={busy} data-testid="step-create">
              {t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
