'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PathProgressResultDto } from '@dacy/shared';
import { t } from '@/lib/i18n';

/** Addım nəticəsindən sonra ümumi bildirişlər: XP, yol bitdi, yol sertifikatı */
export function PathResultToasts({ result }: { result: PathProgressResultDto | null }) {
  const router = useRouter();
  const shown = useRef<PathProgressResultDto | null>(null);
  useEffect(() => {
    if (!result || shown.current === result) return;
    shown.current = result;
    if (result.xpAwarded > 0) toast(`🎉 ${t('ws.earned', { n: result.xpAwarded })}`);
    if (result.pathCompleted) toast(`🏆 ${t('paths.finishedBanner')}`);
    if (result.certificateId)
      toast(`🏅 ${t('paths.claimed')}`, {
        action: {
          label: t('cert.open'),
          onClick: () => router.push(`/sertifikat/${result.certificateId}`),
        },
        duration: 8000,
      });
  }, [result, router]);
  return null;
}
