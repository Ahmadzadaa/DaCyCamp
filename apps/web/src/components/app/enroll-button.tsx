'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export function EnrollButton({
  slug,
  firstStepUrl,
  className,
}: {
  slug: string;
  firstStepUrl: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function enroll() {
    setLoading(true);
    try {
      await api(`/courses/${slug}/enroll`, { method: 'POST' });
      toast(t('course.enrolled'));
      if (firstStepUrl) router.push(firstStepUrl);
      else router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      setLoading(false);
    }
  }
  return (
    <Button onClick={enroll} loading={loading} className={className} size="full">
      {t('course.enroll')}
    </Button>
  );
}
