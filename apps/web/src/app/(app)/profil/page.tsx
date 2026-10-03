import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, Zap } from 'lucide-react';
import type { CertificateSummaryDto } from '@dacy/shared';
import { apiTry, getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { fmtNum, initials } from '@/lib/utils';
import { fmtDate } from '@/components/admin/format';
import { ProfileForms } from '@/components/app/profile-forms';

export const metadata: Metadata = { title: t('nav.profile') };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/profil');
  const certs = (await apiTry<CertificateSummaryDto[]>('/me/certificates')) ?? [];
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6">
      <section className="box profile-head">
        <span className="avatar xl">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <h1>{user.name}</h1>
          <p className="text-muted">
            {user.email} · <span className="badge badge-muted">{t(`role.${user.role}`)}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('profile.memberSince', { date: fmtDate(user.createdAt) })}
          </p>
        </div>
        <div className="profile-stats">
          <div>
            <Zap aria-hidden />
            <b>{fmtNum(user.xpTotal)}</b>
            <span>{t('profile.xp')}</span>
          </div>
          <Link href="/sertifikatlar">
            <Award aria-hidden />
            <b>{certs.filter((c) => !c.revokedAt).length}</b>
            <span>{t('profile.certificates')}</span>
          </Link>
        </div>
      </section>
      <ProfileForms user={user} />
    </div>
  );
}
