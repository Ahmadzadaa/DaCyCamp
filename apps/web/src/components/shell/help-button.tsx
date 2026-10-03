'use client';
import { CircleHelp } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const FAQ = [
  ['shell.helpQ1', 'shell.helpA1'],
  ['shell.helpQ2', 'shell.helpA2'],
  ['shell.helpQ3', 'shell.helpA3'],
  ['shell.helpQ4', 'shell.helpA4'],
] as const;

/** Sağ aşağıdakı dairəvi kömək düyməsi → qısa yollar və tez-tez verilən suallar */
export function HelpButton() {
  return (
    <Dialog>
      <DialogTrigger className="help" aria-label={t('shell.help')} title={t('shell.help')}>
        <CircleHelp aria-hidden />
      </DialogTrigger>
      <DialogContent title={t('shell.helpTitle')} description={t('shell.helpIntro')}>
        <section>
          <h3 className="help-h">{t('shell.helpShortcuts')}</h3>
          <dl className="help-keys">
            <div>
              <dt>
                <kbd>/</kbd>
              </dt>
              <dd>{t('shell.helpShortcutSearch')}</dd>
            </div>
            <div>
              <dt>
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
              </dt>
              <dd>{t('shell.helpShortcutRun')}</dd>
            </div>
          </dl>
        </section>
        <section className="mt-5">
          <h3 className="help-h">{t('shell.helpFaq')}</h3>
          <div className="help-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{t(q)}</summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>
        </section>
        <p className="mt-5 text-sm text-muted">{t('shell.helpContact')}</p>
      </DialogContent>
    </Dialog>
  );
}
