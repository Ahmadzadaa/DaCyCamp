'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { CompleteResultDto, StepViewDto, TheoryStudentView } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/app/markdown';
import { VideoEmbed } from '@/components/app/video-embed';
import { useAfterComplete } from './use-complete';
import { toast } from 'sonner';

export function TheoryView({ view, content }: { view: StepViewDto; content: TheoryStudentView }) {
  const after = useAfterComplete(view.course.slug);
  const [busy, setBusy] = useState(false);
  const q = view.preview ? '?preview=1' : '';
  const nextHref = view.next
    ? `/kurs/${view.course.slug}/${view.next.moduleKey}/${view.next.stepKey}${view.preview ? '?onizle=1' : ''}`
    : `/kurs/${view.course.slug}`;

  async function done() {
    setBusy(true);
    try {
      const r = await api<CompleteResultDto>(`/learn/steps/${view.id}/complete${q}`, {
        method: 'POST',
      });
      after(r, view.preview);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="ws-scroll">
      <div className="ws-center ws-read">
        <div className="kicker mb-3 flex flex-wrap items-center gap-2">
          <span
            className="badge badge-track"
            style={{ ['--c' as string]: view.course.track.color }}
          >
            {t('stepType.THEORY')} · {view.position.index} / {view.position.total}
          </span>
          <span className="xp">{t('common.plusXp', { n: view.xp })}</span>
        </div>
        <h1 className="mb-4 text-[1.6rem]">{view.title}</h1>
        {content.video_url ? (
          <div className="mb-5">
            <VideoEmbed url={content.video_url} assetMap={view.assets} />
          </div>
        ) : null}
        <Markdown content={content.content} assetMap={view.assets} dark />
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-navy-line pt-5">
          {view.state === 'completed' && !view.preview ? (
            <>
              <span className="text-sm font-semibold text-ok">✓ {t('common.completed')}</span>
              <span className="flex-1" />
              <Link href={nextHref} className="b b-brand">
                {view.next ? t('ws.nextStep') : t('ws.backToCourse')} →
              </Link>
            </>
          ) : (
            <>
              <span className="flex-1" />
              <Button onClick={done} loading={busy}>
                {t('ws.readDone')} →
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
