'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

/** Platforma tapşırığını mövcud redaktorda açır (server kursa yazır və lazım olsa addımı açır) */
export function OpenStepButton({
  assignmentId,
  itemId,
  disabled,
}: {
  assignmentId: string;
  itemId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const r = await api<{ url: string }>(
        `/academy/me/assignments/${assignmentId}/items/${itemId}/open`,
        { method: 'POST' },
      );
      router.push(r.url);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Button
      variant="navy"
      size="sm"
      onClick={open}
      loading={busy}
      disabled={disabled}
      data-testid="academy-open-step"
    >
      <ExternalLink className="size-4" />
      {t('academy.detail.open')}
    </Button>
  );
}
