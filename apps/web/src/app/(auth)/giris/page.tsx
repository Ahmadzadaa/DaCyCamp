import type { Metadata } from 'next';
import { AuthForm } from '@/components/app/auth-form';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: t('nav.login') };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={next} />;
}
