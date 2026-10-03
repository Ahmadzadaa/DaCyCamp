'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PathCardDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

/** Yol başlığındakı düymə: yazıl → aktiv et → davam et */
export function PathEnrollButton({
  slug,
  enrolled,
  isActive,
  continueUrl,
  loggedIn,
}: {
  slug: string;
  enrolled: boolean;
  isActive: boolean;
  continueUrl: string | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function call(action: 'enroll' | 'activate') {
    setBusy(true);
    try {
      await api<PathCardDto>(`/paths/${slug}/${action}`, { method: 'POST' });
      toast.success(action === 'enroll' ? t('paths.enrolled') : t('paths.activeBadge'));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!loggedIn)
    return (
      <Button
        type="button"
        onClick={() => router.push(`/giris?next=${encodeURIComponent(`/yol/${slug}`)}`)}
      >
        {t('paths.start')}
      </Button>
    );
  if (!enrolled)
    return (
      <Button
        type="button"
        loading={busy}
        onClick={() => void call('enroll')}
        data-testid="path-enroll"
      >
        {t('paths.start')}
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {continueUrl ? (
        <Button type="button" onClick={() => router.push(continueUrl)} data-testid="path-continue">
          {t('paths.continue')}
        </Button>
      ) : null}
      {!isActive ? (
        <Button type="button" variant="navy" loading={busy} onClick={() => void call('activate')}>
          {t('paths.makeActive')}
        </Button>
      ) : null}
    </div>
  );
}
