import { Paperclip } from 'lucide-react';
import type { AcademyAttemptDto, AcademyItemDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { fmtScore } from './format';

/** Bir cəhdin cavabları (tələbə və müəllim görünüşü üçün ortaq) */
export function AttemptAnswers({
  attempt,
  items,
}: {
  attempt: AcademyAttemptDto;
  items: AcademyItemDto[];
}) {
  return (
    <ul className="flex flex-col gap-3 pt-2 text-sm">
      {attempt.answers.map((ans) => {
        const item = items.find((i) => i.id === ans.itemId);
        return (
          <li key={ans.itemId} className="flex flex-col gap-1">
            <b>{item?.step?.title ?? item?.title}</b>
            {ans.text ? <p className="whitespace-pre-wrap">{ans.text}</p> : null}
            {ans.code ? (
              <pre className="mono overflow-x-auto rounded-lg bg-paper p-3 text-xs">{ans.code}</pre>
            ) : null}
            {ans.link ? (
              <a
                href={ans.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all underline"
              >
                {ans.link}
              </a>
            ) : null}
            {ans.files.length ? (
              <div className="ac-files">
                {ans.files.map((f) => (
                  <a key={f.id} href={`/api/academy/files/${f.id}`} className="ac-file" download>
                    <Paperclip className="size-4 shrink-0" aria-hidden />
                    <span>{f.filename}</span>
                  </a>
                ))}
              </div>
            ) : null}
            {ans.evaluation ? (
              <span className="text-muted">
                {ans.evaluation.passed ? t('academy.detail.solved') : t('academy.detail.notSolved')}
                {ans.evaluation.score !== null
                  ? ` · ${fmtScore(ans.evaluation.score)} / ${fmtScore(item?.maxScore)}`
                  : ''}
                {ans.evaluation.trust ? ` · ${t(`academy.trust.${ans.evaluation.trust}`)}` : ''}
              </span>
            ) : null}
            {!ans.text && !ans.code && !ans.link && !ans.files.length && !ans.evaluation ? (
              <span className="text-muted">{t('academy.gradeForm.noAnswer')}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
