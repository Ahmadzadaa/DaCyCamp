'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gauge } from 'lucide-react';
import { LEVELS, levelLabelsSchema, type LevelLabels } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdmin } from './admin-context';

/** Admin: kataloq filtrindəki, kartlardakı və kurs səhifəsindəki səviyyə adları */
export function LevelLabelsCard({ initial }: { initial: LevelLabels }) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = LEVELS.some((l) => v[l] !== saved[l]);

  async function save() {
    const parsed = levelLabelsSchema.safeParse(v);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t('errors.VALIDATION_FAILED'));
      return;
    }
    setBusy(true);
    try {
      const r = await api<LevelLabels>('/admin/settings/levels', {
        method: 'PUT',
        body: parsed.data,
      });
      setV(r);
      setSaved(r);
      toast.success(t('levels.saved'));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="box" aria-labelledby="lv-title" data-testid="level-labels">
      <h2 id="lv-title" className="box-h">
        <Gauge aria-hidden />
        {t('levels.title')}
      </h2>
      <p className="mb-4 text-sm text-muted">{t('levels.desc')}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {LEVELS.map((l, i) => (
          <label key={l} className="fld">
            <span className="lbl flex items-center gap-2">
              <span className={cn('lvb', `l${i + 1}`)} aria-hidden>
                <b />
                <b />
                <b />
              </span>
              {t(`levels.key${i + 1}` as 'levels.key1')}
            </span>
            <Input
              value={v[l]}
              disabled={!isAdmin}
              onChange={(e) => setV((x) => ({ ...x, [l]: e.target.value }))}
              data-testid={`level-label-${l}`}
            />
          </label>
        ))}
      </div>
      {isAdmin ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={save} disabled={!dirty} loading={busy}>
            {t('common.save')}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">{t('users.readOnly')}</p>
      )}
    </section>
  );
}
