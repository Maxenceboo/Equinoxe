import { describe, expect, it } from 'vitest';
import { lireInvitation } from './invitation.service';

describe('lireInvitation', () => {
  it('lit un code ami et le met en majuscules', () => {
    expect(lireInvitation(new URLSearchParams('ami=k7p2qx'))).toEqual({ type: 'ami', code: 'K7P2QX' });
  });
  it('lit un code de groupe à 6 chiffres', () => {
    expect(lireInvitation(new URLSearchParams('groupe=123 456'))).toEqual({ type: 'groupe', code: '123456' });
  });
  it('ignore un lien incomplet', () => {
    expect(lireInvitation(new URLSearchParams('ami=ABC'))).toBeNull();
    expect(lireInvitation(new URLSearchParams(''))).toBeNull();
  });
});
