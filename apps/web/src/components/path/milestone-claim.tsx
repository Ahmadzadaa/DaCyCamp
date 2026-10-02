'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Award } from 'lucide-react';
import type { PathItemViewDto, PathProgressResultDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { PathResultToasts } from './path-result-toasts';

type M = NonNullable<PathItemViewDto['milestone']>;

/** Final addımı: çatışmayanların siyahısı və ya «Sertifikatı al» */
export function MilestoneClaim({
  itemId,
  milestone,
  preview,
}: {
  itemId: string;
  milestone: M;
  preview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    (PathProgressResultDto & { certificateId: string | null }) | null
  >(null);
  const certId = result?.certificateId ?? milestone.certificateId;
  async function claim() {
    setBusy(true);
    try {
      const r = await api<PathProgressResultDto & { certificateId: string | null }>(
        `/learn/path-items/${itemId}/milestone${preview ? '?preview=1' : ''}`,
        { method: 'POST' },
      );
      setResult(r);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="box flex flex-col gap-3" data-testid="milestone">
      <b className="flex items-center gap-2">
        <Award className="size-5 text-brand" /> {milestone.certificateTitle}
      </b>
      {certId ? (
        <>
          <p className="text-sm text-ok">✓ {t('paths.claimed')}</p>
          <Link
            href={`/sertifikat/${certId}`}
            className="b b-brand self-start"
            data-testid="milestone-cert"
          >
            {t('paths.openCertificate')}
          </Link>
        </>
      ) : milestone.missing.length ? (
        <>
          <p className="text-sm text-muted">{t('paths.missing')}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {milestone.missing.map((m) => (
              <li key={m.key}>
                <Link href={m.url} className="hover:underline">
                  ○ {m.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{t('paths.allDone')}</p>
          <Button
            type="button"
            loading={busy}
            onClick={() => void claim()}
            className="self-start"
            data-testid="milestone-claim"
          >
            🏆 {t('paths.claim')}
          </Button>
        </>
      )}
      <PathResultToasts result={result} />
    </div>
  );
}
