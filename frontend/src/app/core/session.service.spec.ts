import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseService } from '../donnees/supabase.service';
import { SessionService } from './session.service';

function service() {
  const auth = {
    onAuthStateChange: vi.fn(),
    setSession: vi.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SupabaseService, useValue: { client: { auth } } }],
  });
  return { session: TestBed.inject(SessionService), auth };
}

describe('lien de confirmation', () => {
  it('reprend la session depuis les jetons du fragment', async () => {
    const { session, auth } = service();
    const ok = await session.ouvrirLien('equinoxe://auth#access_token=A&refresh_token=R&type=signup');
    expect(ok).toBe(true);
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'A', refresh_token: 'R' });
  });

  it('accepte aussi un code (flux PKCE)', async () => {
    const { session, auth } = service();
    expect(await session.ouvrirLien('equinoxe://auth?code=XYZ')).toBe(true);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('XYZ');
  });

  it("ignore un lien sans jeton", async () => {
    const { session } = service();
    expect(await session.ouvrirLien('equinoxe://auth')).toBe(false);
  });
});
