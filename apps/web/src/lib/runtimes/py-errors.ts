/**
 * Pyodide traceback-ini tələbə üçün oxunaqlı edir: Pyodide-in daxili sətirləri (_pyodide/_base.py, run_async)
 * atılır, «<exec>» → «script.py», xəta tipinə görə Azərbaycanca izah əlavə olunur, xəta sətri qaytarılır
 * (redaktorda qırmızı xətlə göstərmək üçün).
 */

const USER_FILE = '<exec>';

const HINTS: Record<string, (msg: string) => string> = {
  NameError: (m) => {
    const name = /name '([^']+)' is not defined/.exec(m)?.[1];
    return name
      ? `«${name}» adlı dəyişən və ya funksiya tapılmadı. Ona əvvəlcə dəyər verin (məs. ${name} = ...) və ya adın düzgün yazıldığını yoxlayın — böyük/kiçik hərf fərqlidir.`
      : 'Dəyişən və ya funksiya tapılmadı — əvvəlcə ona dəyər verin və adını yoxlayın.';
  },
  SyntaxError: () =>
    'Sintaksis xətası: mötərizələri, dırnaqları və bloklardan əvvəl iki nöqtəni (:) yoxlayın. Word və ya slayddan köçürülmüş əyri dırnaqlar (“ ”) da bu xətanı verir.',
  IndentationError: () =>
    'Girinti xətası: bir blokdakı sətirlər eyni sayda boşluqla başlamalıdır (adətən 4 boşluq). if, for, def-dən sonrakı sətirlər içəridən yazılır.',
  TabError: () => 'Tab və boşluq qarışıb — girintini yalnız boşluqlarla (4 boşluq) yazın.',
  TypeError: () =>
    'Tip uyğunsuzluğu: məsələn, sətirlə ədədi toplamaq olmaz ("5" + 3). Lazım olsa int(), float() və ya str() ilə çevirin. Funksiyaya düzgün sayda arqument verdiyinizi də yoxlayın.',
  ValueError: () =>
    'Dəyər uyğun deyil: məsələn, int("abc") — rəqəm olmayan mətni ədədə çevirmək olmur.',
  ZeroDivisionError: () => 'Sıfıra bölmək olmaz — bölənin 0 olmadığını yoxlayın.',
  IndexError: () =>
    'Siyahıda belə indeks yoxdur: indekslər 0-dan başlayır, sonuncu element len(siyahı) - 1-dir.',
  KeyError: () =>
    'Dictionary-də belə açar yoxdur — açarın adını yoxlayın və ya .get(açar) istifadə edin.',
  AttributeError: () =>
    'Bu obyektin belə metodu və ya atributu yoxdur — adını yoxlayın (məs. siyahıda .add() yox, .append() var).',
  ModuleNotFoundError: () => 'Belə modul tapılmadı — import sətrində adı yoxlayın.',
  UnboundLocalError: () =>
    'Dəyişən funksiyanın içində dəyər alınmadan istifadə olunub — əvvəlcə ona dəyər verin.',
  RecursionError: () => 'Funksiya özünü dayanmadan çağırır — dayanma şərtini (base case) yoxlayın.',
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
      return { text: message ? `✗ ${message}` : '✗ Test keçmədi', line: null };
    if (type === 'NameError') {
      const name = /name '([^']+)' is not defined/.exec(message)?.[1];
      return {
        text: name
          ? `✗ Testlər «${name}» adlı dəyişəni və ya funksiyanı tapmadı — onu kodunda tapşırıqdakı adla təyin et.`
          : `✗ ${last}`,
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
    const where = m[3] && m[3] !== '<module>' ? ` («${m[3]}» funksiyasında)` : '';
    frames.push(`script.py, sətir ${line}${where}`);
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
