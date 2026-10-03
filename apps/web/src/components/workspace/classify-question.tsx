'use client';
import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Sabit qarışdırma (server və brauzerdə eyni sıra — hidrasiya uyğunsuzluğu olmasın) */
function stableOrder(n: number, seedText: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  const rnd = () => {
    h = (h + 0x6d2b79f5) | 0;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * «Qruplara ayır» sualı: elementləri qruplara sürüşdürmək (masaüstü) və ya elementə, sonra qrupa
 * toxunmaq (mobil, klaviatura). `value[i]` — i-ci elementin qrupu, -1 = hələ yerləşdirilməyib.
 */
export function ClassifyQuestion({
  qi,
  text,
  options,
  buckets,
  value,
  onChange,
  correct,
  disabled,
}: {
  qi: number;
  text: string;
  options: string[];
  buckets: string[];
  value: number[];
  onChange: (next: number[]) => void;
  /** nəticədən sonra: hər elementin düzgün qrupu */
  correct?: number[];
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const order = useMemo(
    () => stableOrder(options.length, text + options.join('|')),
    [text, options],
  );
  const locked = disabled || !!correct;
  const pool = order.filter((i) => (value[i] ?? -1) < 0);

  function place(item: number, bucket: number) {
    if (locked) return;
    onChange(options.map((_, k) => (k === item ? bucket : (value[k] ?? -1))));
    setSelected(null);
  }
  function dropTarget(bucket: number) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (locked) return;
        e.preventDefault();
        setOver(bucket);
      },
      onDragLeave: () => setOver((o) => (o === bucket ? null : o)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(null);
        const item = Number(e.dataTransfer.getData('text/plain'));
        if (Number.isInteger(item) && item >= 0 && item < options.length) place(item, bucket);
      },
      onClick: () => {
        if (selected !== null) place(selected, bucket);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (selected !== null && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          place(selected, bucket);
        }
      },
      role: selected !== null ? 'button' : undefined,
      tabIndex: selected !== null ? 0 : undefined,
    };
  }

  const chip = (i: number) => {
    const placed = value[i] ?? -1;
    const ok = correct ? correct[i] === placed : null;
    return (
      <button
        key={i}
        type="button"
        draggable={!locked}
        disabled={disabled && !correct}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(i));
          e.dataTransfer.effectAllowed = 'move';
          setSelected(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (locked) return;
          // seçilmiş element varsa və qrupdakı başqa elementə toxunulursa — seçilmişi həmin qrupa qoy
          // (mobil: dolu qrupa toxunanda çox vaxt elementin üstünə düşülür)
          if (selected !== null && selected !== i && placed >= 0) return place(selected, placed);
          setSelected((s) => (s === i ? null : i));
        }}
        aria-pressed={selected === i}
        className={cn(
          'cls-chip',
          selected === i && 'sel',
          ok === true && 'good',
          ok === false && 'bad',
        )}
        data-testid={`cls-item-${qi}-${i}`}
      >
        <span className="cls-txt">
          {ok === true ? <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
          {ok === false ? <X className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
          <span>{options[i]}</span>
        </span>
        {ok === false && correct ? (
          <small className="cls-fix">
            {t('ws.classifyRight', { bucket: buckets[correct[i]!] ?? '' })}
          </small>
        ) : null}
      </button>
    );
  };

  return (
    <div className="cls">
      {!correct ? (
        <div
          className={cn('cls-pool', over === -1 && 'over', selected !== null && 'armed')}
          {...dropTarget(-1)}
          data-testid={`cls-pool-${qi}`}
        >
          <span className="cls-h">
            {t('ws.classifyPool')} · {pool.length}
          </span>
          <div className="cls-chips">
            {pool.length ? (
              pool.map(chip)
            ) : (
              <span className="cls-empty">✓ {t('ws.classifyDone')}</span>
            )}
          </div>
        </div>
      ) : null}
      <div className="cls-buckets" style={{ ['--n' as string]: buckets.length }}>
        {buckets.map((b, bi) => {
          const items = order.filter((i) => value[i] === bi);
          return (
            <div
              key={bi}
              className={cn('cls-bucket', over === bi && 'over', selected !== null && 'armed')}
              aria-label={b}
              {...dropTarget(bi)}
              data-testid={`cls-bucket-${qi}-${bi}`}
            >
              <span className="cls-h">{b}</span>
              <div className="cls-chips">
                {items.length ? (
                  items.map(chip)
                ) : (
                  <span className="cls-empty">{t('ws.classifyDrop')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
