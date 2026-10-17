import { productionSecretProblems } from './env';

describe('productionSecretProblems', () => {
  const strong = (c: string) => c.repeat(40);

  it('nümunə (.env.example) açarları rədd edir', () => {
    const p = productionSecretProblems({
      JWT_ACCESS_SECRET: 'deyisin-access-gizli-acar',
      JWT_REFRESH_SECRET: 'deyisin-refresh-gizli-acar',
      CTF_PEPPER: 'deyisin-ctf-pepper',
    });
    expect(p).toHaveLength(3);
    expect(p.join(' ')).toContain('nümunə');
  });

  it('qısa və eyni açarları rədd edir', () => {
    expect(
      productionSecretProblems({
        JWT_ACCESS_SECRET: 'qisa-acar-123',
        JWT_REFRESH_SECRET: strong('r'),
        CTF_PEPPER: strong('p'),
      }),
    ).toEqual(['JWT_ACCESS_SECRET: ən azı 32 simvol olmalıdır']);
    expect(
      productionSecretProblems({
        JWT_ACCESS_SECRET: strong('a'),
        JWT_REFRESH_SECRET: strong('a'),
        CTF_PEPPER: strong('p'),
      }),
    ).toEqual(['JWT_REFRESH_SECRET: JWT_ACCESS_SECRET ilə eyni olmamalıdır']);
  });

  it('güclü, fərqli açarları qəbul edir', () => {
    expect(
      productionSecretProblems({
        JWT_ACCESS_SECRET: strong('a'),
        JWT_REFRESH_SECRET: strong('r'),
        CTF_PEPPER: strong('p'),
      }),
    ).toEqual([]);
  });
});
