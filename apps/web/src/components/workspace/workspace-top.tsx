import Link from 'next/link';
import { X } from 'lucide-react';
import type { StepViewDto } from '@dacy/shared';
import { Logo } from '@/components/app/logo';
import { t } from '@/lib/i18n';

export function WorkspaceTop({ view }: { view: StepViewDto }) {
  const courseUrl = `/kurs/${view.course.slug}`;
  return (
    <>
      <div className="ws-top">
        <Logo text={null} href={courseUrl} className="text-[0.95rem]" />
        <div className="crumb">
          {view.module.title} › <b>{view.title}</b>
        </div>
        <div
          className="pbar"
          role="progressbar"
          aria-valuenow={view.coursePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${t('common.percent', { n: view.coursePercent })}`}
        >
          <i style={{ width: `${view.coursePercent}%` }} />
        </div>
        <span className="xp">{view.userXp.toLocaleString('az-AZ')} XP</span>
        <Link
          href={courseUrl}
          className="rounded-md p-1 text-on-dark-muted hover:text-on-dark"
          aria-label={t('ws.exit')}
          title={t('ws.backToCourse')}
        >
          <X className="size-[18px]" />
        </Link>
      </div>
      {view.preview ? (
        <div className="bg-de/90 px-4 py-1.5 text-center text-xs font-semibold text-[#2b1d00]">
          {t('common.previewMode')}
        </div>
      ) : null}
    </>
  );
}
