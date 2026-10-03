import type { StepType } from '@dacy/shared';
import { BookOpenText, CodeXml, Flag, ListChecks, SquareTerminal } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAP: Record<StepType, { cls: string; glyph: React.ReactNode }> = {
  THEORY: { cls: 't', glyph: 'T' },
  QUIZ: { cls: 'q', glyph: '?' },
  SQL: { cls: 'c', glyph: '{}' },
  PYTHON: { cls: 'c', glyph: '{}' },
  TERMINAL: { cls: 'l', glyph: '>_' },
  CTF: { cls: 'f', glyph: <Flag className="size-3" strokeWidth={2.5} /> },
};

export function StepIcon({ type, className }: { type: StepType; className?: string }) {
  const m = MAP[type];
  return (
    <span className={cn('ic', m.cls, className)} aria-hidden>
      {m.glyph}
    </span>
  );
}

/** Böyük kafel üçün lucide ikonu (panel «Qaldığınız yer», Təcrübə siyahısı) */
export function stepLucide(type: StepType) {
  return STEP_LUCIDE[type];
}
const STEP_LUCIDE: Record<StepType, typeof Flag> = {
  THEORY: BookOpenText,
  QUIZ: ListChecks,
  SQL: CodeXml,
  PYTHON: CodeXml,
  TERMINAL: SquareTerminal,
  CTF: Flag,
};
