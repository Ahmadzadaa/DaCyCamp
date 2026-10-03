import { describe, expect, it } from 'vitest';
import { formatPyError } from './py-errors';

const tb = (tail: string) =>
  [
    'Traceback (most recent call last):',
    '  File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async',
    '    await CodeRunner(',
    '    ...<9 lines>...',
    '    .run_async(globals, locals)',
    '  File "/lib/python313.zip/_pyodide/_base.py", line 411, in run_async',
    '    coroutine = eval(self.code, globals, locals)',
    tail,
  ].join('\n');

describe('formatPyError', () => {
  it('NameError: Pyodide daxili sətirləri atılır, sətir və izah', () => {
    const v = formatPyError(
      tb('  File "<exec>", line 5, in <module>\nNameError: name \'cem\' is not defined'),
    );
    expect(v.line).toBe(5);
    expect(v.text).not.toContain('_pyodide');
    expect(v.text).toContain('script.py, sətir 5');
    expect(v.text).toContain("NameError: name 'cem' is not defined");
    expect(v.text).toContain('«cem» adlı dəyişən');
  });

  it('funksiya içində xəta: son kadrın sətri, funksiyanın adı', () => {
    const v = formatPyError(
      tb(
        '  File "<exec>", line 7, in <module>\n  File "<exec>", line 3, in kvadrat\nTypeError: can only concatenate str (not "int") to str',
      ),
    );
    expect(v.line).toBe(3);
    expect(v.text).toContain('«kvadrat» funksiyasında');
    expect(v.text).toContain('Tip uyğunsuzluğu');
  });

  it('SyntaxError: kod parçası və ^ saxlanılır', () => {
    const v = formatPyError(
      tb('  File "<exec>", line 2\n    print("a"\n         ^\nSyntaxError: \'(\' was never closed'),
    );
    expect(v.line).toBe(2);
    expect(v.text).toContain('print("a"');
    expect(v.text).toContain('Sintaksis xətası');
  });

  it('testlər: yalnız assert mesajı, sətir yoxdur', () => {
    const v = formatPyError(
      tb('  File "<exec>", line 1, in <module>\nAssertionError: cem 4 olmalıdır'),
      { tests: true },
    );
    expect(v).toEqual({ text: '✗ cem 4 olmalıdır', line: null });
    expect(
      formatPyError(tb("NameError: name 'yeni' is not defined"), { tests: true }).text,
    ).toContain('«yeni» adlı dəyişəni');
  });
});
