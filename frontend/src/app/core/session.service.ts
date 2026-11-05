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
  /** Utilisateur connecté : un compte avec email, ou un membre de foyer entré par code (anonyme). */
  readonly utilisateur = signal<{ id?: string; email: string | null; anonyme: boolean } | null>(null);
  readonly email = computed(() => this.utilisateur()?.email ?? null);
  readonly anonyme = computed(() => this.utilisateur()?.anonyme ?? false);
  readonly connecte = computed(() => this.utilisateur() !== null);

  constructor() {
    this.db.auth.onAuthStateChange((_evenement, session) => this.noter(session?.user));
  }

  private noter(user: { id: string; email?: string; is_anonymous?: boolean } | undefined): void {
    this.utilisateur.set(user ? { id: user.id, email: user.email || null, anonyme: !!user.is_anonymous } : null);
  }

  /** À l'ouverture de l'app : reprend la session enregistrée, même sans réseau. */
  async demarrer(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Lien de confirmation d'email (equinoxe://auth#access_token=…) : l'app s'ouvre déjà connectée
      void App.addListener('appUrlOpen', async ({ url }) => {
        // Lien d'invitation (equinoxe://invite?ami=…) : la page d'invitation s'en occupe
        if (url.startsWith('equinoxe://invite')) {
          void this.router.navigateByUrl('/invite' + url.slice('equinoxe://invite'.length));
          return;
        }
        if (await this.ouvrirLien(url)) void this.router.navigateByUrl('/', { replaceUrl: true });
      });
    }
    const { data } = await this.db.auth.getSession();
    this.noter(data.session?.user);
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

  ouvrir(email: string | null, anonyme = false): void {
    this.utilisateur.set({ id: this.utilisateur()?.id, email, anonyme });
  }

  async fermer(): Promise<void> {
    this.utilisateur.set(null);
    await this.db.auth.signOut({ scope: 'local' });
  }
}
