import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from '../donnees/supabase.service';

/**
 * Session de l'utilisateur. Supabase la garde dans le stockage local (navigateur ou webview Android)
 * et rafraîchit le jeton tout seul ; ce service en expose l'état aux écrans.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly db = inject(SupabaseService).client;
  private readonly router = inject(Router);
  readonly email = signal<string | null>(null);
  readonly connecte = computed(() => this.email() !== null);

  constructor() {
    this.db.auth.onAuthStateChange((_evenement, session) => this.email.set(session?.user.email ?? null));
  }

  /** À l'ouverture de l'app : reprend la session enregistrée, même sans réseau. */
  async demarrer(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Lien de confirmation d'email (equinoxe://auth#access_token=…) : l'app s'ouvre déjà connectée
      void App.addListener('appUrlOpen', async ({ url }) => {
        if (await this.ouvrirLien(url)) void this.router.navigateByUrl('/', { replaceUrl: true });
      });
    }
    const { data } = await this.db.auth.getSession();
    this.email.set(data.session?.user.email ?? null);
  }

  /** Reprend la session transmise par le lien de confirmation (jetons dans le fragment, ou code). */
  async ouvrirLien(url: string): Promise<boolean> {
    const lien = new URL(url);
    const fragment = new URLSearchParams(lien.hash.replace(/^#/, ''));
    const access_token = fragment.get('access_token');
    const refresh_token = fragment.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await this.db.auth.setSession({ access_token, refresh_token });
      return !error;
    }
    const code = lien.searchParams.get('code');
    if (code) {
      const { error } = await this.db.auth.exchangeCodeForSession(code);
      return !error;
    }
    return false;
  }

  ouvrir(email: string): void {
    this.email.set(email);
  }

  async fermer(): Promise<void> {
    this.email.set(null);
    await this.db.auth.signOut({ scope: 'local' });
  }
}
