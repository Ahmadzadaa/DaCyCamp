'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

export function LockedToast({ active, href }: { active: boolean; href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    toast(`🔒 ${t('common.locked')}`, { description: t('course.lockedToast') });
    router.replace(href, { scroll: false });
  }, [active, href, router]);
  return null;
}
