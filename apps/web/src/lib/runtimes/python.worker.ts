import { getPyodide, runPython } from './python-engine';
import { setRuntimeLocale } from './runtime-locale';
import type { Locale } from '@dacy/shared';

type Request = {
  id: number;
  locale: Locale;
  action: 'init' | 'run';
  code?: string;
  opts?: Parameters<typeof runPython>[1];
};

globalThis.onmessage = async (event: MessageEvent<Request>) => {
  const { id, locale, action, code, opts } = event.data;
  setRuntimeLocale(locale);
  try {
    const result =
      action === 'init' ? (await getPyodide(), null) : await runPython(code ?? '', opts);
    globalThis.postMessage({ id, result });
  } catch (error) {
    globalThis.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
