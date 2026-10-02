import type { ResultTable } from './canonical';

/**
 * Apache Arrow cədvəlini (DuckDB-WASM nəticəsi) sadə sətirlərə çevirir. Brauzer və server eyni funksiyanı işlədir
 * ki, DECIMAL/HUGEINT/tarix kimi tiplər hər iki tərəfdə eyni mətnə çevrilsin.
 * Struktur tipləşdirmə: apache-arrow paketini import etmədən işləyir.
 */
export interface ArrowLikeField {
  name: string;
  type: { typeId: number; scale?: number; unit?: number };
}
export interface ArrowLikeTable {
  numRows: number;
  schema: { fields: ArrowLikeField[] };
  getChildAt(i: number): { get(j: number): unknown; length: number } | null;
}

/** apache-arrow Type enum (sabit dəyərlər) */
const TYPE_DECIMAL = 7;
const TYPE_DATE = 8;
const TYPE_TIMESTAMP = 10;

const TWO_128 = 1n << 128n;
const TWO_127 = 1n << 127n;

/** Uint32Array(4) (little-endian 128-bit) → bigint */
export function int128ToBigInt(words: ArrayLike<number>): bigint {
  let x = 0n;
  for (let i = words.length - 1; i >= 0; i--) x = (x << 32n) | BigInt(words[i]! >>> 0);
  if (words.length === 4 && x >= TWO_127) x -= TWO_128;
  return x;
}

export function decimalToString(words: ArrayLike<number>, scale: number): string {
  const v = int128ToBigInt(words);
  const neg = v < 0n;
  let digits = (neg ? -v : v).toString();
  if (scale <= 0) return (neg ? '-' : '') + digits;
  if (digits.length <= scale) digits = digits.padStart(scale + 1, '0');
  const intPart = digits.slice(0, digits.length - scale);
  const frac = digits.slice(digits.length - scale).replace(/0+$/, '');
  return (neg ? '-' : '') + intPart + (frac ? `.${frac}` : '');
}

function cell(v: unknown, f: ArrowLikeField): unknown {
  if (v === null || v === undefined) return null;
  if (f.type.typeId === TYPE_DECIMAL && ArrayBuffer.isView(v))
    return decimalToString(v as unknown as ArrayLike<number>, f.type.scale ?? 0);
  if (f.type.typeId === TYPE_DATE) {
    const d = v instanceof Date ? v : new Date(Number(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  }
  if (f.type.typeId === TYPE_TIMESTAMP) {
    const n = typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.getTime() : Number(v);
    const unit = f.type.unit ?? 1; // 0 s, 1 ms, 2 µs, 3 ns
    const ms = unit === 0 ? n * 1000 : unit === 1 ? n : unit === 2 ? n / 1000 : n / 1_000_000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
  }
  return v;
}

export function arrowToResult(t: ArrowLikeTable, limit = Infinity): ResultTable {
  const fields = t.schema.fields;
  const columns = fields.map((f) => f.name);
  const n = Math.min(t.numRows, limit);
  const vectors = fields.map((_, i) => t.getChildAt(i));
  const rows: unknown[][] = [];
  for (let r = 0; r < n; r++) rows.push(fields.map((f, c) => cell(vectors[c]?.get(r), f)));
  return { columns, rows };
}
