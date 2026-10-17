import type { Metadata } from 'next';
import { RegisterFlow } from '@/components/app/register-flow';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('nav.register') };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; kod?: string }>;
}) {
  const { next, kod } = await searchParams;
  // Akademiya modulu söndürülübsə yol seçimi göstərilmir — birbaşa Camp qeydiyyatı
  const academy = await apiTry<{ enabled: boolean }>('/academy/join/status');
  return (
    <RegisterFlow next={next} academyEnabled={!!academy?.enabled} initialCode={kod?.slice(0, 40)} />
  );
}
