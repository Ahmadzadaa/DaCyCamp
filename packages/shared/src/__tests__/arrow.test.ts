import { describe, expect, it } from 'vitest';
import { arrowToResult, decimalToString, int128ToBigInt } from '../sql/arrow';

describe('arrow → result', () => {
  it('128-bit decimal çevrilməsi', () => {
    expect(int128ToBigInt([30, 0, 0, 0])).toBe(30n);
    expect(int128ToBigInt([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])).toBe(-1n);
    expect(decimalToString([4500, 0, 0, 0], 1)).toBe('450');
    expect(decimalToString([12345, 0, 0, 0], 2)).toBe('123.45');
    expect(decimalToString([5, 0, 0, 0], 3)).toBe('0.005');
  });
  it('cədvəli sətirlərə çevirir, tarixləri ISO edir', () => {
    const t = {
      numRows: 2,
      schema: {
        fields: [
          { name: 'a', type: { typeId: 2 } },
          { name: 'd', type: { typeId: 8 } },
          { name: 'm', type: { typeId: 7, scale: 1 } },
        ],
      },
      getChildAt: (i: number) => ({
        length: 2,
        get: (j: number) =>
          [
            [1, 2],
            [new Date('2026-01-31T00:00:00Z'), 1767139200000],
            [new Uint32Array([4500, 0, 0, 0]), null],
          ][i]![j],
      }),
    };
    expect(arrowToResult(t)).toEqual({
      columns: ['a', 'd', 'm'],
      rows: [
        [1, '2026-01-31', '450'],
        [2, '2025-12-31', null],
      ],
    });
    expect(arrowToResult(t, 1).rows.length).toBe(1);
  });
});
