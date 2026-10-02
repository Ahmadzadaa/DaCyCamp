import { signTicket, verifyTicket } from './ticket';

describe('lab bileti (HMAC)', () => {
  const secret = 'test-secret-1234';
  it('imzalanır və yoxlanır', () => {
    const tok = signTicket(secret, { sid: 's', uid: 'u' }, 60);
    expect(verifyTicket(secret, tok)).toEqual({ sid: 's', uid: 'u' });
  });
  it('başqa açar / dəyişdirilmiş gövdə / vaxtı keçmiş → null', () => {
    const tok = signTicket(secret, { sid: 's', uid: 'u' }, 60);
    expect(verifyTicket('other-secret-999', tok)).toBeNull();
    const [body, sig] = tok.split('.');
    expect(verifyTicket(secret, `${body}x.${sig}`)).toBeNull();
    expect(verifyTicket(secret, signTicket(secret, { sid: 's', uid: 'u' }, -5))).toBeNull();
    expect(verifyTicket(secret, 'garbage')).toBeNull();
  });
});
