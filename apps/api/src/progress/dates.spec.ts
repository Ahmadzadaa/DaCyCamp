import { addDays, dayKey, weekDays } from './dates';

describe('dates (Asia/Baku)', () => {
  it('UTC gecə 22:30 Bakıda növbəti gündür', () => {
    expect(dayKey(new Date('2026-03-01T22:30:00Z'), 'Asia/Baku')).toBe('2026-03-02');
    expect(dayKey(new Date('2026-03-01T19:30:00Z'), 'Asia/Baku')).toBe('2026-03-01');
  });
  it('həftə bazar ertəsindən başlayır', () => {
    expect(weekDays('2026-10-01')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
