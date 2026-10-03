'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { SupportTicketDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';

/** Yeni dəstək müraciəti — göndərəndən sonra müraciətin səhifəsinə keçir */
export function NewTicketForm({ pageUrl }: { pageUrl?: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tk = await api<SupportTicketDto>('/support/tickets', {
        method: 'POST',
        body: { subject, body, ...(pageUrl ? { pageUrl } : {}) },
      });
      toast.success(t('support.sent'));
      router.push(`/destek/${tk.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="support-new">
      <Field label={t('support.subject')}>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('support.subjectPh')}
          maxLength={150}
          required
        />
      </Field>
      <Field label={t('support.message')}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('support.messagePh')}
          rows={6}
          maxLength={5000}
          required
        />
      </Field>
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy} disabled={!subject.trim() || !body.trim()}>
        <Send className="size-4" />
        {t('support.send')}
      </Button>
    </form>
  );
}
