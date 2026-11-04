import { Injectable, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Fichier publié avec chaque version stable (workflow « Version stable »). */
export const URL_VERSION = 'https://equinoxe-app.fr/apk/version.json';
export const URL_APK = 'https://equinoxe-app.fr/apk/equinoxe.apk';

/** « 1.10.0 » est plus récent que « 1.9.2 ». */
export function plusRecente(distante: string, locale: string): boolean {
  const a = distante.split('.').map(Number);
  const b = locale.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/**
 * L'app n'est pas sur le Play Store : au démarrage, elle regarde si une version stable plus récente
 * est en ligne, et propose de la télécharger.
 */
@Injectable({ providedIn: 'root' })
export class MiseAJourService {
  readonly disponible = signal<string | null>(null);
  private ecoute = false;

  /** Au démarrage, puis à chaque retour dans l'app (elle reste souvent ouverte en arrière-plan). */
  async verifier(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (!this.ecoute) {
      this.ecoute = true;
      void App.addListener('resume', () => void this.verifier());
    }
    try {
      const [{ version: locale }, reponse] = await Promise.all([App.getInfo(), fetch(URL_VERSION, { cache: 'no-store' })]);
      if (!reponse.ok) return;
      const { version } = (await reponse.json()) as { version: string };
      if (plusRecente(version, locale)) this.disponible.set(version);
    } catch {
      /* hors ligne : on réessaiera au prochain lancement */
    }
  }

  telecharger(): void {
    // Une adresse externe s'ouvre dans le navigateur du téléphone, qui télécharge l'APK
    window.location.href = `${URL_APK}?v=${encodeURIComponent(this.disponible() ?? '')}`;
  }

  ignorer(): void {
    this.disponible.set(null);
  }
}
