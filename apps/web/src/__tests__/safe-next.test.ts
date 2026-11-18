import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/utils';

describe('safeNextPath', () => {
  it('keeps internal paths with query and hash', () => {
    expect(safeNextPath('/kurs/python?tab=1#m2')).toBe('/kurs/python?tab=1#m2');
    expect(safeNextPath('/panel')).toBe('/panel');
  });
  it('rejects external and protocol-relative targets', () => {
    for (const bad of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\\/evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      'javascript:alert(1)',
      'evil.com',
      '',
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad as string | null | undefined)).toBeNull();
    }
  });
});
