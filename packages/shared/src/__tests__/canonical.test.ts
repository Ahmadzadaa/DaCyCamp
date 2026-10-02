import { describe, expect, it } from 'vitest';
import {
  canonicalizeResult,
  duckdbLoadSql,
  normalizeCell,
  resultHash,
  tableNameFromPath,
} from '../sql/canonical';

describe('canonicalizeResult', () => {
  const t = {
    columns: ['City', 'total'],
    rows: [
      ['Bakı', 184520n],
      ['Gəncə', 41300.0],
      [null, 1.1000000000000001],
    ],
  };
  it('sütun adları kiçik hərf, bigint/float/null normalizə', () => {
    const c = canonicalizeResult(t, 'result_match');
    expect(c.split('\n')[0]).toBe('city\u0001total');
    expect(c).toContain('184520');
    expect(c).toContain('∅\u00011.1');
  });
  it('unordered rejimdə sıra fərq etmir, ordered-də edir', async () => {
    const a = { columns: ['x'], rows: [[1], [2]] };
    const b = { columns: ['x'], rows: [[2], [1]] };
    expect(await resultHash(a, 'result_match_unordered')).toBe(
      await resultHash(b, 'result_match_unordered'),
    );
    expect(await resultHash(a, 'result_match')).not.toBe(await resultHash(b, 'result_match'));
  });
  it('float səs-küyü yoxdur', () => expect(normalizeCell(0.1 + 0.2)).toBe('0.3'));
  it('cədvəl adı və yükləmə sql', () => {
    expect(tableNameFromPath('datasets/sales-2024.csv')).toBe('sales_2024');
    expect(duckdbLoadSql('sales.csv', 'sales')).toContain("read_csv_auto('sales.csv'");
    expect(duckdbLoadSql('init.sql', 'init')).toBeNull();
  });
});
