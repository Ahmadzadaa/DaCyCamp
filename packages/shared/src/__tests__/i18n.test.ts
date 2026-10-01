import { describe, expect, it } from 'vitest';
import { t } from '../i18n/t';

describe('t', () => {
  it('parametrləri yerləşdirir', () => {
    expect(t('course.stepsDone', { done: 3, total: 10 })).toBe('3 / 10 addım');
  });
  it('en-də olmayan açar az-a düşür', () => {
    expect(t('ws.readDone', undefined, 'en')).toBe('Oxudum, davam et');
    expect(t('nav.courses', undefined, 'en')).toBe('Courses');
  });
});
