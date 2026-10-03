'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Settings2 } from 'lucide-react';
import type { TopicDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';

/** Kurs formasında mövzu seçimi — çiplər (bir neçəsi seçilə bilər) */
export function TopicPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [topics, setTopics] = useState<TopicDto[] | null>(null);
  useEffect(() => {
    api<TopicDto[]>('/admin/topics')
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  if (topics === null)
    return (
      <div className="flex gap-2" aria-busy="true">
        {[80, 64, 96].map((w) => (
          <span key={w} className="sk h-8 !rounded-full" style={{ width: w }} />
        ))}
      </div>
    );
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t('topics.courseField')}
    >
      {topics.length === 0 ? <span className="text-sm text-muted">{t('topics.empty')}</span> : null}
      {topics.map((tp) => {
        const on = value.includes(tp.id);
        return (
          <button
            key={tp.id}
            type="button"
            className="tchip"
            style={{ ['--c' as string]: tp.color }}
            aria-pressed={on}
            onClick={() => toggle(tp.id)}
            data-testid={`topic-pick-${tp.slug}`}
          >
            {on ? <Check className="size-3.5" aria-hidden /> : <i aria-hidden />}
            {tp.title}
            {!tp.isPublished ? (
              <span className="text-xs text-muted">· {t('topics.hidden')}</span>
            ) : null}
          </button>
        );
      })}
      <Link href="/admin/movzular" className="box-more !mt-0 ml-1" target="_blank">
        <Settings2 aria-hidden />
        {t('topics.manage')}
      </Link>
    </div>
  );
}
