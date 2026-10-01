import { hashAnswer, normalizeAnswer } from './ctf-hash';

describe('ctf-hash', () => {
  it('boşluqları və registri normalizə edir', () => {
    expect(normalizeAnswer('  DACY{ Flag }  ', false)).toBe('dacy{ flag }');
    expect(normalizeAnswer('A   b', true)).toBe('A b');
  });
  it('eyni cavab eyni hash, fərqli cavab fərqli hash', () => {
    expect(hashAnswer('147', false)).toBe(hashAnswer(' 147 ', false));
    expect(hashAnswer('147', false)).not.toBe(hashAnswer('148', false));
    expect(hashAnswer('Abc', true)).not.toBe(hashAnswer('abc', true));
    expect(hashAnswer('Abc', false)).toBe(hashAnswer('abc', false));
    expect(hashAnswer('x', false)).toMatch(/^[0-9a-f]{64}$/);
  });
});
