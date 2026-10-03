'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Gauge, Search, SlidersHorizontal, X } from 'lucide-react';
import { t, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';

/** URL sorğu parametrlərini dəyişib eyni səhifəyə keçir (boş dəyər → silinir) */
function useParamNav() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const go = (patch: Record<string, string | undefined>, replace = false) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    const url = `${path}${s ? `?${s}` : ''}`;
    start(() =>
      replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false }),
    );
  };
  return { go, sp, pending };
}

const LEVEL_OPTS: Array<{ value: string; label: TKey; hint: TKey; bars: number }> = [
  { value: 'BEGINNER', label: 'catalog.levelBeginner', hint: 'catalog.levelBeginnerHint', bars: 1 },
  {
    value: 'INTERMEDIATE',
    label: 'catalog.levelIntermediate',
    hint: 'catalog.levelIntermediateHint',
    bars: 2,
  },
  { value: 'ADVANCED', label: 'catalog.levelAdvanced', hint: 'catalog.levelAdvancedHint', bars: 3 },
];

/** Hero-dakı «Səviyyəmi müəyyən et»: təcrübəni soruşur → kataloq səviyyəyə görə süzülür */
export function LevelPicker() {
  const { go } = useParamNav();
  return (
    <Menu.Root>
      <Menu.Trigger className="b b-navy">
        <Gauge aria-hidden />
        {t('catalog.heroCta')}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="pop menu-pop w-[300px]" sideOffset={8} align="start">
          <Menu.Label className="menu-label">{t('catalog.levelQuestion')}</Menu.Label>
          {LEVEL_OPTS.map((o) => (
            <Menu.Item
              key={o.value}
              className="menu-item items-start"
              onSelect={() => go({ seviyye: o.value })}
            >
              <span className={cn('lvl mt-0.5', `l${o.bars}`)} aria-hidden>
                <i>
                  <b />
                  <b />
                  <b />
                </i>
              </span>
              <span>
                <b className="block text-[0.92rem]">{t(o.label)}</b>
                <span className="text-xs text-muted">{t(o.hint)}</span>
              </span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export interface ChipOpt {
  key: string;
  value: string;
  label: string;
}

/** «+N» çipi: sığmayan filtrlər (kurs növləri) */
export function MoreChips({ options }: { options: ChipOpt[] }) {
  const { go, sp } = useParamNav();
  if (!options.length) return null;
  return (
    <Menu.Root>
      <Menu.Trigger className="chip more" aria-label={t('catalog.moreChips')}>
        +{options.length}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="pop menu-pop min-w-[200px]" sideOffset={8} align="start">
          {options.map((o) => {
            const on = sp.get(o.key) === o.value;
            return (
              <Menu.CheckboxItem
                key={`${o.key}:${o.value}`}
                className="menu-item"
                checked={on}
                onCheckedChange={() => go({ [o.key]: on ? undefined : o.value })}
              >
                {o.label}
                <Menu.ItemIndicator className="ml-auto">
                  <Check className="size-4 text-brand" />
                </Menu.ItemIndicator>
              </Menu.CheckboxItem>
            );
          })}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export interface TopicOpt {
  /** URL parametri: admin mövzusu (`movzu`) və ya praktika növü (`praktika`) */
  key: 'movzu' | 'praktika';
  value: string;
  label: string;
  color?: string;
  count: number;
}

export interface LevelOpt {
  value: string;
  label: string;
  count: number;
}

const SORTS: Array<{ value: string; label: TKey }> = [
  { value: '', label: 'catalog.sortDefault' },
  { value: 'yeni', label: 'catalog.sortNew' },
  { value: 'qisa', label: 'catalog.sortShort' },
  { value: 'ad', label: 'catalog.sortAz' },
];
const DURATIONS: Array<{ value: string; label: TKey }> = [
  { value: '', label: 'catalog.durationAny' },
  { value: 'qisa', label: 'catalog.durationShort' },
  { value: 'orta', label: 'catalog.durationMid' },
  { value: 'uzun', label: 'catalog.durationLong' },
];
const STATUSES: Array<{ value: string; label: TKey }> = [
  { value: '', label: 'catalog.statusAny' },
  { value: 'davam', label: 'catalog.statusActive' },
  { value: 'bitib', label: 'catalog.statusDone' },
  { value: 'yeni', label: 'catalog.statusNew' },
];

/** Sayğac · «Bu siyahıda axtar» · Mövzu · Daha çox filtr */
export function CatalogToolbar({
  count,
  levels,
  level,
  topics,
  topic,
  practice,
  authed,
}: {
  count: number;
  levels: LevelOpt[];
  level?: string;
  topics: TopicOpt[];
  topic?: string;
  practice?: string;
  authed: boolean;
}) {
  const { go, sp, pending } = useParamNav();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const urlQ = sp.get('q') ?? '';
  const picked = topics.filter(
    (x) =>
      (x.key === 'movzu' && x.value === topic) || (x.key === 'praktika' && x.value === practice),
  );
  const own = topics.filter((x) => x.key === 'movzu');
  const kinds = topics.filter((x) => x.key === 'praktika');

  // yazdıqca (300ms gecikmə ilə) URL yenilənir — yalnız dəyər URL-dəkindən fərqlidirsə
  // (əks halda mount-dakı effekt eyni URL-ə replace edib istifadəçinin kliklədiyi linki ləğv edirdi)
  useEffect(() => {
    if (q.trim() === urlQ) return;
    const id = window.setTimeout(() => go({ q: q.trim() || undefined }, true), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => setQ(urlQ), [urlQ]);

  const extra = ['sirala', 'muddet', 'status'].filter((k) => sp.get(k)).length;

  const item = (o: TopicOpt) => {
    const on = o.key === 'movzu' ? o.value === topic : o.value === practice;
    return (
      <Menu.CheckboxItem
        key={`${o.key}:${o.value}`}
        className="menu-item"
        checked={on}
        disabled={!o.count && !on}
        // köhnə ?movzu=sql linkini də təmizləyir
        onCheckedChange={() =>
          go(
            o.key === 'movzu'
              ? { movzu: on ? undefined : o.value }
              : { praktika: on ? undefined : o.value, ...(topic ? {} : { movzu: undefined }) },
          )
        }
      >
        {o.color ? (
          <span className="cdot" style={{ ['--c' as string]: o.color }} aria-hidden />
        ) : null}
        {o.label}
        <span className="ml-auto text-xs text-muted">{o.count}</span>
        <span className="grid w-4 place-items-center">
          <Menu.ItemIndicator>
            <Check className="size-4 text-brand" />
          </Menu.ItemIndicator>
        </span>
      </Menu.CheckboxItem>
    );
  };

  return (
    <div className={cn('tb', pending && 'opacity-70')}>
      <span className="cnt" aria-live="polite">
        <b>{count}</b> {t('catalog.countUnit')}
      </span>
      <label className="srch">
        <Search aria-hidden className="size-[18px] shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('catalog.searchHere')}
          aria-label={t('catalog.searchHere')}
          type="search"
        />
        {q ? (
          <button
            type="button"
            className="text-muted hover:text-ink"
            onClick={() => setQ('')}
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </label>
      <Menu.Root>
        <Menu.Trigger className={cn('sel', level && 'on')} data-testid="catalog-level">
          {level ? (
            <span
              className={cn('lvb', `l${levels.findIndex((x) => x.value === level) + 1}`)}
              aria-hidden
            >
              <b />
              <b />
              <b />
            </span>
          ) : null}
          {levels.find((x) => x.value === level)?.label ?? t('catalog.levelFilter')}
          <ChevronDown aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="pop menu-pop min-w-[220px]" sideOffset={8} align="end">
            <Menu.RadioGroup
              value={level ?? ''}
              onValueChange={(v) => go({ seviyye: v || undefined })}
            >
              <Menu.RadioItem value="" className="menu-item">
                {t('topics.levelAll')}
                <span className="grid ml-auto w-4 place-items-center">
                  <Menu.ItemIndicator>
                    <Check className="size-4 text-brand" />
                  </Menu.ItemIndicator>
                </span>
              </Menu.RadioItem>
              <Menu.Separator className="menu-sep" />
              {levels.map((o, i) => (
                <Menu.RadioItem
                  key={o.value}
                  value={o.value}
                  className="menu-item"
                  disabled={!o.count && level !== o.value}
                >
                  <span className={cn('lvb', `l${i + 1}`)} aria-hidden>
                    <b />
                    <b />
                    <b />
                  </span>
                  {o.label}
                  <span className="ml-auto text-xs text-muted">{o.count}</span>
                  <span className="grid w-4 place-items-center">
                    <Menu.ItemIndicator>
                      <Check className="size-4 text-brand" />
                    </Menu.ItemIndicator>
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <Menu.Root>
        <Menu.Trigger className={cn('sel', picked.length && 'on')} data-testid="catalog-topic">
          {picked[0]?.color ? (
            <span className="cdot" style={{ ['--c' as string]: picked[0].color }} aria-hidden />
          ) : null}
          {picked.length ? picked.map((x) => x.label).join(' · ') : t('catalog.topic')}
          <ChevronDown aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            className="pop menu-pop max-h-[min(70vh,460px)] min-w-[250px] overflow-y-auto"
            sideOffset={8}
            align="end"
          >
            <Menu.Item
              className="menu-item"
              disabled={!picked.length}
              onSelect={() => go({ movzu: undefined, praktika: undefined })}
            >
              {t('catalog.topicAll')}
              {!picked.length ? <Check className="ml-auto size-4 text-brand" /> : null}
            </Menu.Item>
            {own.length ? (
              <>
                <Menu.Separator className="menu-sep" />
                <Menu.Label className="menu-label">{t('topics.groupTopics')}</Menu.Label>
                {own.map(item)}
              </>
            ) : null}
            <Menu.Separator className="menu-sep" />
            <Menu.Label className="menu-label">{t('topics.groupPractice')}</Menu.Label>
            {kinds.map(item)}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <MoreFilters authed={authed} active={extra} />
    </div>
  );
}

function MoreFilters({ authed, active }: { authed: boolean; active: number }) {
  const { go, sp } = useParamNav();
  const [sort, setSort] = useState(sp.get('sirala') ?? '');
  const [dur, setDur] = useState(sp.get('muddet') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSort(sp.get('sirala') ?? '');
    setDur(sp.get('muddet') ?? '');
    setStatus(sp.get('status') ?? '');
  }, [open, sp]);

  const group = (
    title: TKey,
    name: string,
    opts: Array<{ value: string; label: TKey }>,
    value: string,
    set: (v: string) => void,
  ) => (
    <fieldset className="flt-group">
      <legend>{t(title)}</legend>
      <div className="chips">
        {opts.map((o) => (
          <label key={o.value || 'any'} className={cn('chip', value === o.value && 'on')}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => set(o.value)}
              className="sr-only"
            />
            {t(o.label)}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn('b b-ghost', active && 'border-navy')}>
        <SlidersHorizontal aria-hidden />
        {t('catalog.moreFilters')}
        {active ? <span className="flt-count">{active}</span> : null}
      </DialogTrigger>
      <DialogContent title={t('catalog.moreFilters')} className="max-w-[520px]">
        <div className="flex flex-col gap-5">
          {group('catalog.sortBy', 'sirala', SORTS, sort, setSort)}
          {group('catalog.duration', 'muddet', DURATIONS, dur, setDur)}
          {authed ? group('catalog.status', 'status', STATUSES, status, setStatus) : null}
        </div>
        <div className="mt-6 flex justify-between gap-2">
          <button
            type="button"
            className="b b-ghost"
            onClick={() => {
              setSort('');
              setDur('');
              setStatus('');
            }}
          >
            {t('catalog.resetFilters')}
          </button>
          <DialogClose
            className="b b-brand"
            onClick={() =>
              go({
                sirala: sort || undefined,
                muddet: dur || undefined,
                status: status || undefined,
              })
            }
          >
            {t('catalog.applyFilters')}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Aktiv filtr varsa: «Filtrləri təmizlə» linki */
export function ClearFilters({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Link href="/kurslar" className="b b-ghost b-sm">
      <X aria-hidden />
      {t('catalog.clearAll')}
    </Link>
  );
}
