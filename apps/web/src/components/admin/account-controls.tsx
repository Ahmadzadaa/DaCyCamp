'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from './confirm-dialog';

export function AccountControls({
  userId,
  blocked,
  onChanged,
}: {
  userId: string;
  blocked: boolean;
  onChanged: () => Promise<void>;
}) {
  const [action, setAction] = useState<'block' | 'sessions' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    if (!action || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/users/${userId}/${action === 'block' ? 'block' : 'sessions/revoke'}`, {
        method: 'POST',
        ...(action === 'block' ? { body: { blocked: !blocked } } : {}),
      });
      setAction(null);
      await onChanged();
      toast.success(t('reliability.securitySaved'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="box flex flex-wrap items-center gap-3" data-testid="account-controls">
      <strong className="mr-auto">
        {t('reliability.accountControls')}
        {blocked ? ` · ${t('reliability.blocked')}` : ''}
      </strong>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setError(null);
          setAction('sessions');
        }}
      >
        {t('reliability.revokeSessions')}
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setError(null);
          setAction('block');
        }}
      >
        {t(blocked ? 'reliability.unblock' : 'reliability.block')}
      </Button>
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
        onConfirm={run}
        error={error}
        title={t(
          action === 'sessions'
            ? 'reliability.revokeSessions'
            : blocked
              ? 'reliability.unblock'
              : 'reliability.block',
        )}
        description={t(
          action === 'sessions'
            ? 'reliability.revokeHint'
            : blocked
              ? 'reliability.unblockHint'
              : 'reliability.blockHint',
        )}
        confirmLabel={t(
          action === 'sessions'
            ? 'reliability.revokeSessions'
            : blocked
              ? 'reliability.unblock'
              : 'reliability.block',
        )}
      />
    </section>
  );
}
