'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminModuleNode } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ModuleRow } from './types';

export function AddModuleDialog({
  open,
  onOpenChange,
  courseId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseId: string;
  onCreated: (m: AdminModuleNode) => void;
}) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const m = await api<ModuleRow>(`/admin/courses/${courseId}/modules`, {
        method: 'POST',
        body: { title: title.trim() },
      });
      onCreated({
        id: m.id,
        key: m.key,
        title: m.title,
        description: m.description,
        order: m.order,
        isPublished: m.isPublished,
        steps: [],
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('admin.newModule')}>
        <form onSubmit={submit} className="flex flex-col gap-3">
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
