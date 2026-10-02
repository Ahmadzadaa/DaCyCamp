import { describe, expect, it } from 'vitest';
import { computeCourseMap } from '../progress/unlock';

const modules = [
  {
    id: 'm1',
    key: 'giris',
    title: 'Giriş',
    order: 1,
    isPublished: true,
    steps: [
      {
        id: 's1',
        key: 'a',
        type: 'THEORY' as const,
        title: 'A',
        xp: 10,
        order: 1,
        isPublished: true,
      },
      {
        id: 's2',
        key: 'b',
        type: 'QUIZ' as const,
        title: 'B',
        xp: 30,
        order: 2,
        isPublished: true,
      },
      {
        id: 'sd',
        key: 'd',
        type: 'SQL' as const,
        title: 'D',
        xp: 50,
        order: 3,
        isPublished: false,
      },
    ],
  },
  {
    id: 'm2',
    key: 'iki',
    title: 'İki',
    order: 2,
    isPublished: true,
    steps: [
      { id: 's3', key: 'c', type: 'SQL' as const, title: 'C', xp: 50, order: 1, isPublished: true },
    ],
  },
];

describe('computeCourseMap', () => {
  it('ardıcıl rejimdə yalnız ilk addım açıqdır', () => {
    const m = computeCourseMap({ sequential: true, modules, progress: [] });
    expect(m.flat.map((s) => s.state)).toEqual(['available', 'locked', 'locked']);
    expect(m.total).toBe(3);
    expect(m.continueStep?.stepKey).toBe('a');
  });
  it('əvvəlki tamamlananda növbəti açılır, fəsil sərhədini keçir', () => {
    const m = computeCourseMap({
      sequential: true,
      modules,
      progress: [
        { stepId: 's1', status: 'COMPLETED' },
        { stepId: 's2', status: 'COMPLETED' },
      ],
    });
    expect(m.flat.map((s) => s.state)).toEqual(['completed', 'completed', 'available']);
    expect(m.modules[0]!.state).toBe('done');
    expect(m.modules[1]!.state).toBe('active');
    expect(m.percent).toBe(66);
  });
  it('sərbəst rejimdə kilid yoxdur', () => {
    const m = computeCourseMap({ sequential: false, modules, progress: [] });
    expect(m.flat.every((s) => s.state === 'available')).toBe(true);
  });
  it('dərc olunmamış addım sayılmır, includeUnpublished ilə görünür', () => {
    expect(computeCourseMap({ sequential: true, modules, progress: [] }).total).toBe(3);
    expect(
      computeCourseMap({ sequential: true, modules, progress: [], includeUnpublished: true }).total,
    ).toBe(4);
  });
  it('hamısı tamamlananda isComplete', () => {
    const m = computeCourseMap({
      sequential: true,
      modules,
      progress: ['s1', 's2', 's3'].map((id) => ({ stepId: id, status: 'COMPLETED' as const })),
    });
    expect(m.isComplete).toBe(true);
    expect(m.continueStep).toBeNull();
  });
  it('admin əl ilə açdığı addım "available" olur, sonrakılar kilidli qalır', () => {
    const m = computeCourseMap({ sequential: true, modules, progress: [], unlocked: ['s2'] });
    expect(m.flat.map((s) => s.state)).toEqual(['available', 'available', 'locked']);
    const started = computeCourseMap({
      sequential: true,
      modules,
      progress: [{ stepId: 's2', status: 'IN_PROGRESS' }],
      unlocked: ['s2'],
    });
    expect(started.flat[1]!.state).toBe('in_progress');
  });
});
