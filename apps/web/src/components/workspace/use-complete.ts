'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { CompleteResultDto } from '@dacy/shared';
import { t } from '@/lib/i18n';

export function useAfterComplete(courseSlug: string) {
  const router = useRouter();
  return (r: CompleteResultDto, preview: boolean) => {
    if (r.xpAwarded > 0 || preview)
      toast(`🎉 ${t('ws.correct')}`, { description: t('ws.earned', { n: r.xpAwarded }) });
    if (r.courseCompleted && !preview) toast(`🏆 ${t('ws.courseDone')}`);
    const q = preview ? '?onizle=1' : '';
    if (r.next) router.push(`/kurs/${courseSlug}/${r.next.moduleKey}/${r.next.stepKey}${q}`);
    else router.push(`/kurs/${courseSlug}`);
    router.refresh();
  };
}
