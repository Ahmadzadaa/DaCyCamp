import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Markdown } from '@/components/app/markdown';
import { courseMeta } from '@/components/app/course-card';
import { initials } from '@/lib/utils';

describe('Markdown', () => {
  it('nisbi şəkil yolunu kursun fayl xəritəsinə görə çevirir', () => {
    const { container } = render(
      <Markdown
        content="![a](images/x.png) ![b](https://ex.am/p.png)"
        assetMap={{ 'images/x.png': '/api/assets/1/x.png' }}
      />,
    );
    const srcs = Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(srcs).toEqual(['/api/assets/1/x.png', 'https://ex.am/p.png']);
  });
  it('script teqlərini təmizləyir', () => {
    const { container } = render(
      <Markdown content={'salam <script>alert(1)</script> **qalın**'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('qalın');
  });
});

describe('courseMeta', () => {
  const base = {
    id: '1',
    slug: 's',
    title: 't',
    level: 'BEGINNER' as const,
    description: '',
    coverUrl: null,
    estimatedHours: null,
    sequential: true,
    track: { slug: 'x', title: 'X', color: '#000' },
    moduleCount: 2,
    datasetCount: 0,
  };
  it('lab üstünlük təşkil edəndə "lab" yazır', () => {
    expect(
      courseMeta({ ...base, stepCount: 4, stepTypeCounts: { TERMINAL: 3, THEORY: 1 } }),
    ).toEqual(['Başlanğıc', '2 fəsil', '3 lab']);
  });
  it('adi halda tapşırıq sayı', () => {
    expect(courseMeta({ ...base, stepCount: 6, stepTypeCounts: { THEORY: 3, QUIZ: 3 } })[2]).toBe(
      '6 tapşırıq',
    );
  });
});

describe('initials', () => {
  it('iki hərf', () => expect(initials('Orxan Rəhimov')).toBe('OR'));
});
