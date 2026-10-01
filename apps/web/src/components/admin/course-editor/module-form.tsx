'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { AdminModuleNode } from '@dacy/shared';
import { api, ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '../confirm-dialog';
import { StatusBadge } from '../status-badge';
import { useAdmin } from '../admin-context';
import type { ModuleRow } from './types';

export function ModuleForm({
  module: m,
  onChange,
  onDeleted,
}: {
  module: AdminModuleNode;
  onChange: (p: Partial<AdminModuleNode>) => void;
  onDeleted: () => void;
}) {
  const { isAdmin } = useAdmin();
  const [title, setTitle] = useState(m.title);
  const [description, setDescription] = useState(m.description ?? '');
  const [isPublished, setIsPublished] = useState(m.isPublished);
  const [busy, setBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [needForce, setNeedForce] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const row = await api<ModuleRow>(`/admin/modules/${m.id}`, {
        method: 'PATCH',
        body: { title: title.trim(), description: description.trim() || undefined, isPublished },
      });
      onChange({ title: row.title, description: row.description, isPublished: row.isPublished });
      toast.success(t('admin.moduleSaved'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(force = false) {
    setDelError(null);
    try {
      await api(`/admin/modules/${m.id}${force ? '?force=1' : ''}`, { method: 'DELETE' });
      toast.success(t('admin.deleted'));
      setDelOpen(false);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MODULE_HAS_PROGRESS') setNeedForce(true);
      setDelError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <StatusBadge published={m.isPublished} />
          <h2 className="mt-1.5 text-[1.3rem]">{m.title}</h2>
          <p className="text-xs text-muted">{t('admin.moduleSettings')}</p>
        </div>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setNeedForce(false);
            setDelError(null);
            setDelOpen(true);
          }}
        >
          <Trash2 className="size-4" />
          {t('common.delete')}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('common.title')}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </Field>
        <Field label={t('admin.key')} hint={t('admin.keyHint')}>
          <Input value={m.key} readOnly className="font-mono text-muted" />
        </Field>
        <Field label={t('common.description')} full>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field label={t('common.status')}>
          <label className="flex items-center gap-3 py-1 text-sm font-normal">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <span>{isPublished ? t('common.published') : t('common.draft')}</span>
          </label>
        </Field>
        <div className="flex items-end justify-end">
          <Button type="submit" loading={busy}>
            {t('common.save')}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={t('admin.deleteModule')}
        description={t('admin.deleteModuleDesc', { n: m.steps.length })}
        onConfirm={() => remove(false)}
        error={delError}
      >
        {needForce && isAdmin ? (
          <div className="rounded-lg border border-de/50 bg-de/10 px-3 py-2 text-sm">
            <p>{t('admin.hasProgress')}</p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-2"
              onClick={() => remove(true)}
            >
              {t('admin.forceDelete')}
            </Button>
          </div>
        ) : null}
      </ConfirmDialog>
    </form>
  );
}
