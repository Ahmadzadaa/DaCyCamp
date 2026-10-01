import { describe, expect, it } from 'vitest';
import { parseFileName, slugify } from '../keys';

describe('slugify', () => {
  it('Azərbaycan hərflərini çevirir', () => {
    expect(slugify('Qruplaşdırma və aqreqasiya')).toBe('qruplasdirma-ve-aqreqasiya');
    expect(slugify('SQL ilə data analizi')).toBe('sql-ile-data-analizi');
    expect(slugify('Şəhərlər üzrə satış')).toBe('seherler-uzre-satis');
    expect(slugify('İlk ETL pipeline')).toBe('ilk-etl-pipeline');
  });
  it('boş sətirdə x qaytarır', () => expect(slugify('!!!')).toBe('x'));
});

describe('parseFileName', () => {
  it('rəqəmli prefiksi sıraya, qalanını açara çevirir', () => {
    expect(parseFileName('03-select.yaml')).toEqual({ order: 3, key: 'select', ext: 'yaml' });
    expect(parseFileName('01-nezeri.md')).toEqual({ order: 1, key: 'nezeri', ext: 'md' });
    expect(parseFileName('modules/02-qruplasdirma')).toEqual({
      order: 2,
      key: 'qruplasdirma',
      ext: '',
    });
    expect(parseFileName('giris')).toEqual({ order: null, key: 'giris', ext: '' });
  });
});
