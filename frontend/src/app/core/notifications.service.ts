import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { firstValueFrom } from 'rxjs';
import { ObjectifsService, RappelsService } from '../application/services';
import { ajouterJours } from '../domaine/jours';

const CANAL = 'rappels-objectifs';
const JOURS = 14;
const ID_SECOURS = 1000;
const ID_BILAN = 1001;
const ID_RELANCE = 1002;
/** Après ces jours sans coche, une seule relance douce. */
export const JOURS_AVANT_RELANCE = 3;

/** Date de la relance douce : 18 h, 3 jours après la dernière coche ; aucune si elle est déjà passée. */
export function dateRelance(derniereCoche: string | null, maintenant: Date): Date | null {
  if (!derniereCoche) return null;
  const [a, m, j] = ajouterJours(derniereCoche, JOURS_AVANT_RELANCE).split('-').map(Number);
  const quand = new Date(a, m - 1, j, 18, 0);
  return quand > maintenant ? quand : null;
}

/**
 * Programme sur le téléphone les rappels calculés par le serveur (répartis sur la semaine).
 * À rappeler après chaque changement : les anciens rappels sont remplacés.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly rappels = inject(RappelsService);
  private readonly objectifs = inject(ObjectifsService);
  private readonly router = inject(Router);
  private prete = false;

  /** Toucher une notification ouvre le bon écran : le bilan, ou l'objectif concerné. */
  ecouterOuvertures(): void {
    if (!Capacitor.isNativePlatform()) return;
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const extra = action.notification.extra as { route?: string; objectifId?: number } | undefined;
      if (extra?.route) this.router.navigateByUrl(extra.route);
      else if (extra?.objectifId) this.router.navigate(['/objectifs', extra.objectifId]);
    });
  }

  async synchroniser(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return; // navigateur : pas de notifications locales
    try {
      if (!(await this.preparer())) return;
      const liste = await firstValueFrom(this.rappels.prochainsRappels(JOURS));
      const derniere = await firstValueFrom(this.objectifs.derniereCoche());
      const relance = dateRelance(derniere, new Date());
      const enAttente = await LocalNotifications.getPending();
      if (enAttente.notifications.length) {
        await LocalNotifications.cancel({ notifications: enAttente.notifications.map((n) => ({ id: n.id })) });
      }
      await LocalNotifications.schedule({
        notifications: [
          ...liste.slice(0, 60).map((r, i) => ({
            id: i + 1,
            channelId: CANAL,
            title: r.nomObjectif,
            body: r.message,
            schedule: { at: new Date(r.dateHeure), allowWhileIdle: true },
            extra: { objectifId: r.objectifId },
          })),
          // Filet de sécurité : si l'app n'est pas ouverte pendant 2 semaines, les rappels calculés
          // s'arrêtent ; ce rappel du lundi matin, lui, revient chaque semaine.
          {
            id: ID_SECOURS,
            channelId: CANAL,
            title: 'Nouvelle semaine',
            body: 'Tes objectifs t\'attendent : ouvre l\'app pour garder ta flamme.',
            schedule: { on: { weekday: 2, hour: 9, minute: 0 }, allowWhileIdle: true },
          },
          // Relance douce, une seule fois, après 3 jours sans coche
          ...(relance
            ? [{
                id: ID_RELANCE,
                channelId: CANAL,
                title: 'Ta série t\'attend',
                body: 'Pas de souci, ça arrive. Un tap suffit pour repartir.',
                schedule: { at: relance, allowWhileIdle: true },
              }]
            : []),
          // Bilan du dimanche soir : ouvre l'écran de bilan
          {
            id: ID_BILAN,
            channelId: CANAL,
            title: 'Ton bilan de la semaine',
            body: 'Regarde ce que tu as tenu cette semaine, et prépare la suivante.',
            schedule: { on: { weekday: 1, hour: 20, minute: 0 }, allowWhileIdle: true },
            extra: { route: '/bilan' },
          },
        ],
      });
    } catch (e) {
      console.warn('Rappels non programmés', e);
    }
  }

  async toutAnnuler(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const enAttente = await LocalNotifications.getPending();
    if (enAttente.notifications.length) {
      await LocalNotifications.cancel({ notifications: enAttente.notifications.map((n) => ({ id: n.id })) });
    }
  }

  private async preparer(): Promise<boolean> {
    if (this.prete) return true;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    await LocalNotifications.createChannel({ id: CANAL, name: 'Rappels des objectifs', importance: 4 });
    this.prete = true;
    return true;
  }
}
