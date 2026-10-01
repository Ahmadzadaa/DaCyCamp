'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { STEP_TYPES, type AdminStepDto, type AdminStepNode, type StepType } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Seg } from '../seg';
import { stepNodeOf } from './types';

const TYPE_OPTIONS = STEP_TYPES.map((x) => ({ value: x, label: t(`stepTypeShort.${x}`) }));

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleId || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const dto = await api<AdminStepDto>(`/admin/modules/${moduleId}/steps`, {
        method: 'POST',
        body: { type, title: title.trim() },
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
    <Dialog open={moduleId !== null} onOpenChange={onOpenChange}>
      <DialogContent title={t('admin.newStep')}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="fld">
            <span className="lbl">{t('admin.stepType')}</span>
            <Seg
              value={type}
              onChange={setType}
              options={TYPE_OPTIONS}
              label={t('admin.stepType')}
            />
          </div>
          <label className="fld">
            <span className="lbl">{t('common.title')}</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              maxLength={200}
            />
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
            <Button type="submit" loading={busy} disabled={!title.trim()}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
