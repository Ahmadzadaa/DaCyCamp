'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

export function ClassroomAction({
  path,
  body,
  children,
  confirm,
  className,
  onDone,
}: {
  path: string;
  body?: unknown;
  children: React.ReactNode;
  confirm?: 'archive' | 'hide' | 'file';
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: 'POST', body });
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      if (!confirm) toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        loading={busy}
        onClick={() => (confirm ? setOpen(true) : void run())}
      >
        {children}
      </Button>
      {confirm ? (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          danger={false}
          title={t(
            confirm === 'archive'
              ? 'classroom.archiveTitle'
              : confirm === 'file'
                ? 'classroom.hideFileTitle'
                : 'classroom.hideReplyTitle',
          )}
          description={t(
            confirm === 'archive'
              ? 'classroom.archiveHint'
              : confirm === 'file'
                ? 'classroom.hideFileHint'
                : 'classroom.hideReplyHint',
          )}
          confirmLabel={t(
            confirm === 'archive'
              ? 'classroom.archive'
              : confirm === 'file'
                ? 'classroom.hideFile'
                : 'classroom.hideReply',
          )}
          onConfirm={run}
          error={error}
        />
      ) : null}
    </>
  );
}
