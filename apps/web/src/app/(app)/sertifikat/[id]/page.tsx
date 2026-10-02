import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CertificateDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { CertificateCard } from '@/components/app/certificate-card';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await apiTry<CertificateDto>(`/certificates/${encodeURIComponent(id)}`);
  return {
    title: c ? `${t('cert.title')} · ${c.studentName}` : t('cert.notFound'),
    robots: { index: false },
  };
}

/** İctimai yoxlama səhifəsi — giriş tələb etmir */
export default async function CertificatePage({ params }: Props) {
  const { id } = await params;
  const cert = await apiTry<CertificateDto>(`/certificates/${encodeURIComponent(id)}`);
  if (!cert) notFound();
  return <CertificateCard cert={cert} />;
}
