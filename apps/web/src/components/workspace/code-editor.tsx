'use client';
import { useEffect, useRef, useState } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Monaco öz serverimizdən (public/monaco/vs) yüklənir — CDN-siz.
// <Editor> mount olan kimi yükləməyə başlayır, ona görə konfiq modul səviyyəsində (effect-dən əvvəl) qurulur.
if (typeof window !== 'undefined') loader.config({ paths: { vs: '/monaco/vs' } });

export function CodeEditor({
  value,
  onChange,
  language,
  onRun,
  readOnly,
  autoFocus,
  height,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  language: 'sql' | 'python';
  onRun?: () => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** sabit hündürlük (admin formaları); verilməsə valideyni doldurur */
  height?: number;
  ariaLabel?: string;
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const [ready, setReady] = useState(false);
  // Redaktor idarə olunmayan (uncontrolled) rejimdədir: hər düymədə `value` geri ötürülsəydi,
  // React yenidən render-i gecikəndə köhnə dəyər redaktora yazılır və sürətli yazıda hərflər itirdi.
  // Xaricdən gələn dəyişiklik (məs. «Başlanğıc koda qaytar») yalnız son yazılandan fərqli olanda tətbiq olunur.
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const lastEmitted = useRef(value);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || value === lastEmitted.current || value === ed.getValue()) return;
    lastEmitted.current = value;
    const model = ed.getModel();
    if (!model) return;
    // undo tarixçəsi qorunsun deyə setValue yox, edit əməliyyatı
    ed.pushUndoStop();
    ed.executeEdits('external', [{ range: model.getFullModelRange(), text: value }]);
    ed.pushUndoStop();
  }, [value]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    // redaktor yüklənənə qədər dəyər dəyişmiş ola bilər (məs. yadda saxlanmış qaralama)
    lastEmitted.current = latest.current;
    if (editor.getValue() !== latest.current) editor.setValue(latest.current);
    monaco.editor.defineTheme('dacy', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '8FB4FF' },
        { token: 'string', foreground: 'F2C46D' },
        { token: 'comment', foreground: '6B7A99', fontStyle: 'italic' },
        { token: 'number', foreground: 'F79BB5' },
        { token: 'identifier', foreground: 'E6ECF7' },
        { token: 'predefined', foreground: '9EE6CF' },
      ],
      colors: {
        'editor.background': '#0E1B30',
        'editor.foreground': '#E6ECF7',
        'editorLineNumber.foreground': '#4D5F82',
        'editorLineNumber.activeForeground': '#93A1BC',
        'editor.lineHighlightBackground': '#13233F',
        'editor.selectionBackground': '#2A3F66',
        'editorCursor.foreground': '#2BD4A4',
        'editorIndentGuide.background': '#1B2F52',
      },
    });
    monaco.editor.setTheme('dacy');
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    if (autoFocus) editor.focus();
    setReady(true);
  };

  return (
    <div
      className={cn('relative bg-workspace', height ? 'code-field' : 'min-h-0 flex-1')}
      style={height ? { height } : undefined}
      data-testid="code-editor"
    >
      <Editor
        language={language}
        defaultValue={value}
        onChange={(v) => {
          lastEmitted.current = v ?? '';
          onChange(v ?? '');
        }}
        onMount={onMount}
        theme="dacy"
        loading={
          <div className="p-4 font-mono text-sm text-on-dark-muted">{t('ws.loadingEditor')}</div>
        }
        options={{
          minimap: { enabled: false },
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 13.5,
          lineHeight: 23,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 14, bottom: 14 },
          readOnly,
          // Chromium-un EditContext API-si ilə Monaco 0.5x sürətli yazıda hərfləri itirir — klassik textarea girişi
          editContext: false,
          // ı, ə kimi Azərbaycan hərfləri «oxşar simvol» kimi işarələnməsin
          unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: true },
          ariaLabel,
          wordWrap: 'on',
          tabSize: language === 'python' ? 4 : 2,
          insertSpaces: true,
          renderLineHighlight: 'line',
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
      {!ready ? <span className="sr-only">{t('ws.loadingEditor')}</span> : null}
    </div>
  );
}
