import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AdminSupportTicketDto } from '@dacy/shared';
import { AdminSupportTicket } from '@/components/support/admin-ticket';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('support.adminTitle') };
}

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await apiTry<AdminSupportTicketDto>(`/admin/support/${id}`);
  if (!ticket) notFound();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link href="/admin/destek" className="back-link">
        <ArrowLeft aria-hidden />
        {t('support.back')}
      </Link>
      <AdminSupportTicket ticket={ticket} />
    </div>
  );
}
