'use client';
import { cn } from '@/lib/utils';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Referansdakı `.seg` seqment kontrolu — klaviatura ilə radio qrupu kimi işləyir */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  disabled,
  title,
  label,
  className,
}: {
  value: T;
  options: ReadonlyArray<SegOption<T>>;
  onChange: (v: T) => void;
  disabled?: boolean;
  title?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('seg', className)} role="radiogroup" aria-label={label} title={title}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={cn(on && 'on', 'disabled:cursor-not-allowed disabled:opacity-60')}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              const i = options.findIndex((x) => x.value === value);
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                onChange(options[(i + 1) % options.length]!.value);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                onChange(options[(i - 1 + options.length) % options.length]!.value);
              }
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
