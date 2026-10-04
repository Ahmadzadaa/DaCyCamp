import type { Metadata } from 'next';
import { AuthForm } from '@/components/app/auth-form';
import { t } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: t('nav.register') };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next} />;
}
