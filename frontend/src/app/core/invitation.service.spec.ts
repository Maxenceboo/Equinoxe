import { describe, expect, it } from 'vitest';
import { lireInvitation } from './invitation.service';

describe('lireInvitation', () => {
  it('lit un identifiant ami, sans @ et en minuscules', () => {
    expect(lireInvitation(new URLSearchParams('ami=%40Lea.M'))).toEqual({ type: 'ami', code: 'lea.m' });
  });
  it('lit encore un ancien code ami', () => {
    expect(lireInvitation(new URLSearchParams('ami=K7P2QX'))).toEqual({ type: 'ami', code: 'k7p2qx' });
  });
  it('lit un code de groupe à 6 chiffres', () => {
    expect(lireInvitation(new URLSearchParams('groupe=123 456'))).toEqual({ type: 'groupe', code: '123456' });
  });
  it('ignore un lien incomplet', () => {
    expect(lireInvitation(new URLSearchParams('ami=ab'))).toBeNull();
    expect(lireInvitation(new URLSearchParams(''))).toBeNull();
  });
});
