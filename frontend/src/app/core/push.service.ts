import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from '../donnees/supabase.service';
import type { Json } from '../donnees/database.types';

/** Un rappel prêt à être envoyé par le serveur (version web). */
export interface RappelWeb {
  quand: string;
  titre: string;
  corps: string;
  route?: string;
}

/** iPhone ou iPad (les iPad récents se présentent comme un Mac tactile). */
export function estIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Ouverte depuis l'écran d'accueil, en plein écran, et non dans un onglet du navigateur. */
export function estInstallee(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const octets = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return octets;
}

/**
 * Rappels de la version web (iPhone surtout) : le navigateur ne peut pas programmer de notifications,
 * alors on s'abonne au Web Push et le serveur envoie les rappels à l'heure dite.
 * Sur Android, l'app native garde ses notifications locales et ce service ne fait rien.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly db = inject(SupabaseService).client;
  /** Le navigateur sait recevoir des notifications (sur iPhone : seulement une fois l'app installée). */
  readonly possible = !Capacitor.isNativePlatform() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  readonly actifs = signal(false);

  /** Enregistre le service worker (cache hors ligne + réception des rappels). */
  async demarrer(): Promise<void> {
    if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const abo = await reg.pushManager?.getSubscription();
      this.actifs.set(!!abo && Notification.permission === 'granted');
    } catch (e) {
      console.warn('Service worker non enregistré', e);
    }
  }

  /** À appeler depuis un tap (obligatoire sur iPhone pour demander la permission). */
  async activer(): Promise<boolean> {
    if (!this.possible) return false;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    let abo = await reg.pushManager.getSubscription();
    if (!abo) {
      const { data, error } = await this.db.functions.invoke<{ cle: string }>('rappels-push', { body: { action: 'cle' } });
      if (error || !data?.cle) throw error ?? new Error('clé indisponible');
      abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(data.cle) });
    }
    const json = abo.toJSON();
    const { error } = await this.db.rpc('enregistrer_push', {
      p_endpoint: abo.endpoint,
      p_p256dh: json.keys?.['p256dh'] ?? '',
      p_auth: json.keys?.['auth'] ?? '',
    });
    if (error) throw error;
    this.actifs.set(true);
    return true;
  }

  /** Remplace les prochains rappels envoyés par le serveur. */
  async programmer(rappels: RappelWeb[]): Promise<void> {
    if (!this.actifs()) return;
    const { error } = await this.db.rpc('programmer_rappels', { p_rappels: rappels as unknown as Json });
    if (error) throw error;
  }

  /** Déconnexion : ce navigateur ne reçoit plus les rappels de ce compte. */
  async desactiver(): Promise<void> {
    if (!this.possible) return;
    try {
      const abo = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (!abo) return;
      await this.db.rpc('oublier_push', { p_endpoint: abo.endpoint });
      await abo.unsubscribe();
    } catch {
      /* hors ligne : l'abonnement sera remplacé à la prochaine activation */
    } finally {
      this.actifs.set(false);
    }
  }
}
