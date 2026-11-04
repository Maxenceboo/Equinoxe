import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { firstValueFrom } from 'rxjs';
import { ObjectifsService, RappelsService } from '../application/services';
import { ajouterJours } from '../domaine/jours';
import { PushService, RappelWeb } from './push.service';

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

/** Prochaine date (dans les 15 jours) tombant ce jour de la semaine (0 = dimanche) à cette heure. */
function prochaines(jourSemaine: number, heure: number, maintenant: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i, heure, 0);
    if (d.getDay() === jourSemaine && d > maintenant) dates.push(d);
  }
  return dates;
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
  private readonly push = inject(PushService);
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
    if (!Capacitor.isNativePlatform()) return this.synchroniserWeb();
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

  /** Version web : les mêmes rappels, envoyés par le serveur à l'heure dite. */
  private async synchroniserWeb(): Promise<void> {
    if (!this.push.actifs()) return;
    try {
      const maintenant = new Date();
      const liste = await firstValueFrom(this.rappels.prochainsRappels(JOURS));
      const relance = dateRelance(await firstValueFrom(this.objectifs.derniereCoche()), maintenant);
      const web: RappelWeb[] = [
        ...liste.slice(0, 50).map((r) => ({
          quand: new Date(r.dateHeure).toISOString(),
          titre: r.nomObjectif,
          corps: r.message,
          route: `/objectifs/${r.objectifId}`,
        })),
        ...prochaines(1, 9, maintenant).map((d) => ({
          quand: d.toISOString(),
          titre: 'Nouvelle semaine',
          corps: 'Tes objectifs t\'attendent : ouvre l\'app pour garder ta flamme.',
        })),
        ...(relance ? [{ quand: relance.toISOString(), titre: 'Ta série t\'attend', corps: 'Pas de souci, ça arrive. Un tap suffit pour repartir.' }] : []),
        ...prochaines(0, 20, maintenant).map((d) => ({
          quand: d.toISOString(),
          titre: 'Ton bilan de la semaine',
          corps: 'Regarde ce que tu as tenu cette semaine, et prépare la suivante.',
          route: '/bilan',
        })),
      ];
      await this.push.programmer(web.filter((r) => new Date(r.quand) > maintenant));
    } catch (e) {
      console.warn('Rappels web non programmés', e);
    }
  }

  async toutAnnuler(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return this.push.desactiver();
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
