/**
 * SQL nəticəsinin kanonik forması: brauzer (DuckDB-WASM) və server (DuckDB-WASM, Node) eyni funksiyanı işlədir,
 * tələbənin nəticəsinin hash-i həllin hash-i ilə müqayisə olunur. Həllin özü brauzerə göndərilmir.
 */
export interface ResultTable {
  columns: string[];
  rows: unknown[][];
}
export type CheckMode = 'result_match' | 'result_match_unordered';

export interface SqlExpected {
  columns: string[];
  row_count: number;
  row_hash: string;
  mode: CheckMode;
  computed_at: string;
}

export function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'NaN';
    if (Number.isInteger(v)) return String(v);
    return String(Number(v.toPrecision(12)));
  }
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>).join(',');
  try {
    return JSON.stringify(v, (_k, x: unknown) => (typeof x === 'bigint' ? x.toString() : x));
  } catch {
    return String(v);
  }
}

const SEP = '\u0001';

export function canonicalizeResult(t: ResultTable, mode: CheckMode): string {
  const header = t.columns.map((c) => c.trim().toLowerCase()).join(SEP);
  let lines = t.rows.map((r) => r.map(normalizeCell).join(SEP));
  if (mode === 'result_match_unordered') lines = [...lines].sort();
  return [header, ...lines].join('\n');
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function resultHash(t: ResultTable, mode: CheckMode): Promise<string> {
  return sha256Hex(canonicalizeResult(t, mode));
}

/** Dataset fayl yolundan DuckDB cədvəl adı: datasets/sales.csv → sales */
export function tableNameFromPath(p: string): string {
  const base = p.split('/').pop() ?? p;
  const stem = base.replace(/\.[^.]+$/, '');
  const name = stem.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, 't$1');
  return name || 't';
}

/** Dataset uzantısına görə DuckDB oxuma ifadəsi (fayl adı qeydiyyatdan keçmiş olmalıdır) */
export function duckdbLoadSql(fileName: string, table: string): string | null {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  const q = fileName.replace(/'/g, "''");
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt')
    return `CREATE OR REPLACE TABLE "${table}" AS SELECT * FROM read_csv_auto('${q}', header=true)`;
  if (ext === 'parquet')
    return `CREATE OR REPLACE TABLE "${table}" AS SELECT * FROM read_parquet('${q}')`;
  if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson')
    return `CREATE OR REPLACE TABLE "${table}" AS SELECT * FROM read_json_auto('${q}')`;
  if (ext === 'sql') return null; // skript kimi icra olunur
  return null;
}
