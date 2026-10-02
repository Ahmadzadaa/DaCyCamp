'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Lightbulb } from 'lucide-react';
import type { HintResultDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';

/** Addım ipucuları: hər açılış bir dəfə XP cəriməsi; mətn yalnız serverdən gəlir */
export function HintsBox({
  stepId,
  hintCount,
  unlocked: initial,
  penalty,
  preview,
}: {
  stepId: string;
  hintCount: number;
  unlocked: string[];
  penalty: number;
  preview: boolean;
}) {
  const [unlocked, setUnlocked] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  if (hintCount === 0) return null;
  const next = unlocked.length;
  const done = next >= hintCount;

  async function reveal() {
    if (done) return;
    if (penalty > 0 && !preview && !window.confirm(t('ws.hintConfirm', { n: penalty }))) return;
    setBusy(true);
    try {
      const r = await api<HintResultDto>(
        `/learn/steps/${stepId}/hints/${next}${preview ? '?preview=1' : ''}`,
        { method: 'POST' },
      );
      setUnlocked(r.unlocked.length ? r.unlocked : [...unlocked, r.hint]);
      if (r.xpPenalty > 0) toast(t('ws.hintUnlocked', { n: r.xpPenalty }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {unlocked.length ? (
        <div className="task mb-3" style={{ borderLeftColor: 'var(--de)' }}>
          <b className="mb-1 block text-sm text-on-dark">{t('ws.hintsTitle')}</b>
          <ol>
            {unlocked.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </div>
      ) : null}
      <button
        type="button"
        className="b hintb"
        onClick={reveal}
        disabled={done || busy}
        data-testid="hint-button"
      >
        <Lightbulb className="size-4" />
        {done
          ? t('ws.allHintsUsed')
          : penalty > 0 && !preview
            ? t('ws.hintCost', { n: penalty })
            : t('ws.hintFree')}
        {!done ? (
          <span className="text-xs opacity-70">
            {' '}
            ({next + 1}/{hintCount})
          </span>
        ) : null}
      </button>
    </div>
  );
}
