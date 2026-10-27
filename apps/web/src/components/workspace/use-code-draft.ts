'use client';
import { useCallback, useEffect, useState } from 'react';

/** Drafts belong to a learner and a step. Older unscoped keys are left intact, never shown to another account. */
export function useCodeDraft(stepId: string, starter: string, learnerId: string) {
  const key = `dacy:draft:${learnerId}:${stepId}`;
  const [draft, setDraft] = useState({ key, code: starter });
  const code = draft.key === key ? draft.code : starter;
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(key);
    } catch {
      /* storage may be unavailable */
    }
    setDraft({ key, code: saved ?? starter });
  }, [key, starter]);
  const setCode = useCallback(
    (value: string) => {
      setDraft({ key, code: value });
      try {
        if (value === starter) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
        /* Editing still works when browser storage is unavailable. */
      }
    },
    [key, starter],
  );
  return { code, setCode, reset: () => setCode(starter), dirty: code !== starter };
}
