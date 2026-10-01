import type { StepDefinitionDraft } from '@dacy/shared';
import { t } from '@/lib/i18n';

/** SQL / Python / Terminal / CTF — tam forma Mərhələ 2/3-də; indilik oxunaqlı xülasə */
export function ReadonlyDefinition({ def }: { def: StepDefinitionDraft }) {
  const phase = def.type === 'terminal' ? 3 : 2;
  const {
    type: _t,
    title: _ti,
    xp: _x,
    estimated_minutes: _e,
    ...rest
  } = def as Record<string, unknown>;
  const rows = Object.entries(rest).filter(
    ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      <div className="rounded-lg border border-de/50 bg-de/10 px-4 py-3 text-sm">
        {t('admin.formLater', { phase })}
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-[180px_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-xs text-muted">{k}</dt>
            <dd className="m-0 min-w-0">
              {typeof v === 'string' ? (
                <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs">{v}</pre>
              ) : (
                <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs">
                  {JSON.stringify(v, null, 2)}
                </pre>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
