import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { PathCardDto, TrackDto } from '@dacy/shared';
import { apiFetch, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Onboarding } from '@/components/path/onboarding';

export const metadata: Metadata = { title: t('paths.onboardingTitle') };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/baslangic');
  const [tracks, paths] = await Promise.all([
    apiFetch<TrackDto[]>('/tracks'),
    apiFetch<PathCardDto[]>('/paths'),
  ]);
  return <Onboarding tracks={tracks} paths={paths} />;
}
