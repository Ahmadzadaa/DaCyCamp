/**
 * Pyodide traceback-ini tələbə üçün oxunaqlı edir: Pyodide-in daxili sətirləri (_pyodide/_base.py, run_async)
 * atılır, «<exec>» → «script.py», xəta tipinə görə cari dildə izah əlavə olunur, xəta sətri qaytarılır
 * (redaktorda qırmızı xətlə göstərmək üçün).
 */

import { t } from '@/lib/i18n';

const USER_FILE = '<exec>';

const HINTS: Record<string, (msg: string) => string> = {
  NameError: (m) => {
    const name = /name '([^']+)' is not defined/.exec(m)?.[1];
    return name ? t('pyErr.nameNamed', { name }) : t('pyErr.name');
  },
  SyntaxError: () => t('pyErr.syntax'),
  IndentationError: () => t('pyErr.indentation'),
  TabError: () => t('pyErr.tab'),
  TypeError: () => t('pyErr.type'),
  ValueError: () => t('pyErr.value'),
  ZeroDivisionError: () => t('pyErr.zeroDivision'),
  IndexError: () => t('pyErr.index'),
  KeyError: () => t('pyErr.key'),
  AttributeError: () => t('pyErr.attribute'),
  ModuleNotFoundError: () => t('pyErr.moduleNotFound'),
  FileNotFoundError: () => t('pyErr.fileNotFound'),
  UnboundLocalError: () => t('pyErr.unboundLocal'),
  RecursionError: () => t('pyErr.recursion'),
};

export interface PyErrorView {
  /** konsolda göstəriləcək mətn */
  text: string;
  /** tələbə kodundakı xəta sətri (1-dən) — redaktorda işarələmək üçün */
  line: number | null;
}

/** «AssertionError: mesaj» → tip və mesaj */
function splitLast(last: string): { type: string; message: string } {
  const m = /^([A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Warning)?):\s?(.*)$/.exec(
    last.trim(),
  );
  if (!m) return { type: '', message: last.trim() };
  return { type: m[1]!.split('.').pop()!, message: m[2] ?? '' };
}

export function formatPyError(raw: string, opts: { tests?: boolean } = {}): PyErrorView {
  const lines = raw.replace(/\r/g, '').trimEnd().split('\n');
  const lastIdx = (() => {
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i]!.trim()) return i;
    return 0;
  })();
  const last = lines[lastIdx] ?? raw;
  const { type, message } = splitLast(last);

  // Testlər: tələbə test kodunu görmür — yalnız mesaj (assert-in izahı) və ya izahlı xəta
  if (opts.tests) {
    if (type === 'AssertionError')
      return { text: `✗ ${message || t('pyErr.testFailed')}`, line: null };
    if (type === 'NameError') {
      const name = /name '([^']+)' is not defined/.exec(message)?.[1];
      return {
        text: name ? `✗ ${t('pyErr.testsNameMissing', { name })}` : `✗ ${last}`,
        line: null,
      };
    }
    const hint = HINTS[type]?.(message);
    return { text: hint ? `✗ ${last}\n\n💡 ${hint}` : `✗ ${last}`, line: null };
  }

  // Tələbə kodunun kadrları: File "<exec>", line N[, in f] + (SyntaxError-da) kod və ^ sətirləri
  const frames: string[] = [];
  let line: number | null = null;
  for (let i = 0; i < lastIdx; i++) {
    const m = /^\s*File "([^"]+)", line (\d+)(?:, in (.+))?$/.exec(lines[i]!);
    if (!m || m[1] !== USER_FILE) continue;
    line = Number(m[2]);
    const where = m[3] && m[3] !== '<module>' ? t('pyErr.inFunction', { fn: m[3] }) : '';
    frames.push(t('pyErr.frame', { line, where }));
    // SyntaxError: növbəti sətirlər kod parçası və ^ göstəricisidir
    for (let j = i + 1; j < lastIdx && /^\s{4,}\S/.test(lines[j]!); j++) frames.push(lines[j]!);
  }

  const hint = HINTS[type]?.(message);
  const head = frames.length ? `${frames.join('\n')}\n` : '';
  return {
    text: `${head}${last.trim()}${hint ? `\n\n💡 ${hint}` : ''}`,
    line,
  };
}
