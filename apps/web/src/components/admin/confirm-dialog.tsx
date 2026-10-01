'use client';
import { useState } from 'react';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

/** Dağıdıcı əməliyyatlar üçün təsdiq dialoqu; `confirmText` verilərsə həmin mətn yazılmalıdır */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmText,
  confirmDisabled,
  danger = true,
  onConfirm,
  error,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = !confirmText || typed.trim() === confirmText;

  async function go() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
    >
      <DialogContent title={title} description={description}>
        <div className="flex flex-col gap-3">
          {confirmText ? (
            <label className="fld">
              <span className="lbl">{t('common.typeToConfirm', { text: confirmText })}</span>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="font-mono"
              />
            </label>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {error}
            </div>
          ) : null}
          {children}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant={danger ? 'danger' : 'brand'}
              disabled={!ok || confirmDisabled}
              loading={busy}
              onClick={go}
            >
              {confirmLabel ?? t('common.yesDelete')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
