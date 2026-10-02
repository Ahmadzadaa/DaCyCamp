'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Paperclip, X } from 'lucide-react';
import type { AdminProjectReviewDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fmtDate } from './format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';

/** Layihə yoxlaması: təhvil verilənlər, fayllar/link, rəy, qəbul/qaytar */
export function ReviewsTable({ initial }: { initial: AdminProjectReviewDto[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<'SUBMITTED' | 'ALL'>('SUBMITTED');
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const shown = rows.filter((r) => filter === 'ALL' || r.status === 'SUBMITTED');

  async function decide(r: AdminProjectReviewDto, passed: boolean) {
    setBusy(r.id);
    try {
      const u = await api<AdminProjectReviewDto>(`/admin/path-reviews/${r.id}`, {
        method: 'POST',
        body: { passed, feedback: feedback[r.id] ?? r.feedback ?? '' },
      });
      setRows((xs) => xs.map((x) => (x.id === u.id ? u : x)));
      toast.success(t('admin.reviewed'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          className={cn('chip', filter === 'SUBMITTED' && 'on')}
          onClick={() => setFilter('SUBMITTED')}
        >
          {t('admin.pending')}
        </button>
        <button
          type="button"
          className={cn('chip', filter === 'ALL' && 'on')}
          onClick={() => setFilter('ALL')}
        >
          {t('admin.showAll')}
        </button>
      </div>
      {shown.length === 0 ? <div className="box text-muted">{t('admin.reviewsEmpty')}</div> : null}
      {shown.map((r) => (
        <div
          key={r.id}
          className="box flex flex-col gap-2"
          data-testid="review-row"
          data-status={r.status}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <b>{r.user.name}</b>
            <span className="text-muted">{r.user.email}</span>
            <span className="text-muted">·</span>
            <Link href={`/admin/yollar/${r.path.slug}`} className="hover:underline">
              {r.path.title}
            </Link>
            <span className="text-muted">/</span>
            <span>{r.item.title}</span>
            <span
              className={cn(
                'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
                r.status === 'PASSED'
                  ? 'bg-brand/15 text-brand'
                  : r.status === 'FAILED'
                    ? 'bg-error/10 text-error'
                    : 'bg-de/15 text-de',
              )}
            >
              {r.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {r.submittedAt ? (
              <span className="text-muted">{fmtDate(r.submittedAt, true)}</span>
            ) : null}
            {r.files.map((f) => (
              <a
                key={f.url}
                href={f.url}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 hover:border-brand"
              >
                <Paperclip className="size-3" /> {f.filename}
              </a>
            ))}
            {r.link ? (
              <a
                href={r.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 hover:border-brand"
              >
                🔗 {r.link}
              </a>
            ) : null}
          </div>
          {r.note ? <p className="text-sm text-muted">“{r.note}”</p> : null}
          <Textarea
            rows={2}
            placeholder={t('admin.feedback')}
            value={feedback[r.id] ?? r.feedback ?? ''}
            onChange={(e) => setFeedback((f) => ({ ...f, [r.id]: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              loading={busy === r.id}
              onClick={() => void decide(r, true)}
              data-testid="review-approve"
            >
              <Check className="size-4" /> {t('admin.approve')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={busy === r.id}
              onClick={() => void decide(r, false)}
            >
              <X className="size-4" /> {t('admin.reject')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
