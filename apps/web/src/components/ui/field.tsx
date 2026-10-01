import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Etiket + sahə + ipucu/xəta. Tək uşaq elementə avtomatik id verir ki, <label htmlFor> ilə bağlansın
 * (əlçatanlıq + testlərdə getByLabel). Mürəkkəb uşaqlar üçün id verilmir.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  full,
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  full?: boolean;
  htmlFor?: string;
}) {
  const auto = React.useId();
  let content = children;
  let id = htmlFor;
  if (React.isValidElement(children) && !Array.isArray(children)) {
    const el = children as React.ReactElement<{ id?: string }>;
    id = htmlFor ?? el.props.id ?? auto;
    if (!el.props.id) content = React.cloneElement(el, { id });
  }
  return (
    <div className={cn('fld', full && 'md:col-span-2', className)}>
      {label ? (
        <label className="lbl" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {content}
      {error ? (
        <span className="text-error text-xs" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-muted text-xs">{hint}</span>
      ) : null}
    </div>
  );
}
