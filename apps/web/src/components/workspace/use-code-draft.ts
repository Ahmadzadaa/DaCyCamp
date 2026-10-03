'use client';
import { useEffect, useState } from 'react';

const key = (stepId: string) => `dacy:draft:${stepId}`;

function read(stepId: string): string | null {
  try {
    return window.localStorage.getItem(key(stepId));
  } catch {
    return null;
  }
}

/**
 * Tələbənin yazdığı kod brauzerdə yadda qalır — səhifə yenilənəndə və ya addımdan çıxıb qayıdanda itmir.
 * Başlanğıc kodla eyni olan qaralama saxlanılmır (müəllim başlanğıc kodu dəyişəndə tələbə yenisini görsün).
 */
export function useCodeDraft(stepId: string, starter: string) {
  const [code, setCode] = useState(starter);

  // SSR ilə uyğunsuzluq olmasın deyə qaralama mount-dan sonra oxunur
  useEffect(() => {
    const saved = read(stepId);
    if (saved !== null && saved !== starter) setCode(saved);
  }, [stepId, starter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (code === starter) window.localStorage.removeItem(key(stepId));
        else window.localStorage.setItem(key(stepId), code);
      } catch {
        // gizli rejim / dolu yaddaş — qaralama sadəcə saxlanılmır
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [stepId, starter, code]);

  return { code, setCode, reset: () => setCode(starter), dirty: code !== starter };
}
