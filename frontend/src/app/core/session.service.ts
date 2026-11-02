import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../donnees/supabase.service';

/**
 * Session de l'utilisateur. Supabase la garde dans le stockage local (navigateur ou webview Android)
 * et rafraîchit le jeton tout seul ; ce service en expose l'état aux écrans.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly db = inject(SupabaseService).client;
  readonly email = signal<string | null>(null);
  readonly connecte = computed(() => this.email() !== null);

  constructor() {
    this.db.auth.onAuthStateChange((_evenement, session) => this.email.set(session?.user.email ?? null));
  }

  /** À l'ouverture de l'app : reprend la session enregistrée, même sans réseau. */
  async demarrer(): Promise<void> {
    const { data } = await this.db.auth.getSession();
    this.email.set(data.session?.user.email ?? null);
  }

  ouvrir(email: string): void {
    this.email.set(email);
  }

  async fermer(): Promise<void> {
    this.email.set(null);
    await this.db.auth.signOut({ scope: 'local' });
  }
}
