import type { Metadata } from 'next';
import { RegisterFlow } from '@/components/app/register-flow';
import { apiFetch } from '@/lib/api/server';
import { ApiError } from '@/lib/api/errors';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('nav.register') };
}

/**
 * «Camp / Akademiya» seçimi yalnız modul açıq-aşkar söndürüləndə (ACADEMY_DISABLED) gizlənir.
 * Başqa xəta (API əlçatmaz, köhnə API) seçimi gizlətmir — əks halda problem səssiz qalırdı.
 */
async function academyEnabled(): Promise<boolean> {
  try {
    await apiFetch('/academy/join/status');
    return true;
  } catch (e) {
    return !(e instanceof ApiError && e.code === 'ACADEMY_DISABLED');
  }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; kod?: string }>;
}) {
  const { next, kod } = await searchParams;
  return (
    <RegisterFlow
      next={next}
      academyEnabled={await academyEnabled()}
      initialCode={kod?.slice(0, 40)}
    />
  );
}
