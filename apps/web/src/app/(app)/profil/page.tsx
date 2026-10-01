import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { ProfileForms } from '@/components/app/profile-forms';

export const metadata: Metadata = { title: t('nav.profile') };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/profil');
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl">{t('nav.profile')}</h1>
      <ProfileForms user={user} />
    </div>
  );
}
