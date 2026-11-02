import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { firstValueFrom } from 'rxjs';
import { RappelsService } from '../api/generated';

const CANAL = 'rappels-objectifs';
const JOURS = 14;
const ID_SECOURS = 1000;

/**
 * Programme sur le téléphone les rappels calculés par le serveur (répartis sur la semaine).
 * À rappeler après chaque changement : les anciens rappels sont remplacés.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly rappels = inject(RappelsService);
  private prete = false;

  async synchroniser(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return; // navigateur : pas de notifications locales
    try {
      if (!(await this.preparer())) return;
      const liste = await firstValueFrom(this.rappels.prochainsRappels(JOURS));
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
