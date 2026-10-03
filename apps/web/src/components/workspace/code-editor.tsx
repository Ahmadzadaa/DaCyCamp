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
  marker,
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
  /** xəta sətri — qırmızı dalğalı xətt və üzərinə gələndə izah */
  marker?: { line: number; message: string } | null;
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const [ready, setReady] = useState(false);
  // Redaktor idarə olunmayan (uncontrolled) rejimdədir: hər düymədə `value` geri ötürülsəydi,
  // React yenidən render-i gecikəndə köhnə dəyər redaktora yazılır və sürətli yazıda hərflər itirdi.
  // Xaricdən gələn dəyişiklik (məs. «Başlanğıc koda qaytar») yalnız son yazılandan fərqli olanda tətbiq olunur.
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
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

  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    const model = ed?.getModel();
    if (!ed || !monaco || !model) return;
    const line = marker && Math.min(Math.max(marker.line, 1), model.getLineCount());
    monaco.editor.setModelMarkers(
      model,
      'dacy',
      line && marker
        ? [
            {
              startLineNumber: line,
              endLineNumber: line,
              startColumn: model.getLineFirstNonWhitespaceColumn(line) || 1,
              endColumn: model.getLineMaxColumn(line),
              message: marker.message,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        : [],
    );
    if (line) ed.revealLineInCenterIfOutsideViewport(line);
  }, [marker, ready]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // redaktor yüklənənə qədər dəyər dəyişmiş ola bilər (məs. yadda saxlanmış qaralama)
    lastEmitted.current = latest.current;
    if (editor.getValue() !== latest.current) editor.setValue(latest.current);
    monaco.editor.defineTheme('dacy', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'FF7AB2', fontStyle: 'bold' },
        { token: 'string', foreground: 'FF8170' },
        { token: 'comment', foreground: '7F8C98', fontStyle: 'italic' },
        { token: 'number', foreground: 'D9C97C' },
        { token: 'identifier', foreground: 'F5F5F7' },
        { token: 'predefined', foreground: '6BDFFF' },
        { token: 'type', foreground: 'DABAFF' },
      ],
      // Xcode tünd palitrası — dizayn v3 (iOS) ilə uyğun
      colors: {
        'editor.background': '#141416',
        'editor.foreground': '#F5F5F7',
        'editorLineNumber.foreground': '#5A5A5F',
        'editorLineNumber.activeForeground': '#98989F',
        'editor.lineHighlightBackground': '#1C1C1E',
        'editor.selectionBackground': '#3A3A3C',
        'editorCursor.foreground': '#22C79A',
        'editorIndentGuide.background': '#2C2C2E',
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
