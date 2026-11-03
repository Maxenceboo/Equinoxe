import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, defer, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SUPABASE } from '../supabase.config';
import type {
  Bilan,
  CodeBinome,
  Historique,
  Identifiants,
  Objectif,
  ObjectifSaisie,
  ObjectifSuivi,
  Partage,
  Rappel,
  Statistiques,
  Validation,
  ValidationSaisie,
} from '../api/generated';
import { bilan } from '../domaine/bilan';
import { suggestion } from '../domaine/conseil-cible';
import { estDimanche, lundiDe, ajouterJours } from '../domaine/jours';
import { Coche, DetailsCoche, Maintenant, ObjectifPerso } from '../domaine/modele';
import { coche, heureHabituelle, heureRappel } from '../domaine/objectif';
import { historique, progression } from '../domaine/progression';
import { tousLesRappels } from '../domaine/rappels';
import { statistiques } from '../domaine/statistiques';
import { DepotObjectifs, ReglagesObjectif } from '../donnees/depot-objectifs';
import { SupabaseService } from '../donnees/supabase.service';
import { aujourdhui } from '../shared/dates';
import { versErreurHttp } from './erreurs';

/**
 * Cas d'utilisation de l'app. Ils ont les mêmes noms et renvoient les mêmes objets (VO générés depuis le
 * contrat OpenAPI) que l'ancien back : les écrans n'ont pas eu à changer. Les règles viennent du domaine,
 * les données de Supabase.
 */

/** Compte connecté. */
export interface Session {
  token: string;
  email: string;
}

function maintenant(): Maintenant {
  const d = new Date();
  return { jour: aujourdhui(), heure: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
}

@Injectable({ providedIn: 'root' })
class Erreurs {
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);
  private readonly db = inject(SupabaseService).client;

  /** Transforme une promesse en Observable, avec le même traitement d'erreur partout. */
  appel<T>(f: () => Promise<T>, options: { silencieux?: boolean } = {}): Observable<T> {
    return defer(() => from(f())).pipe(
      catchError((e: unknown) => {
        const erreur = versErreurHttp(e);
        if (erreur.status === 0) {
          // Pas de réseau : les écrans gèrent eux-mêmes le mode hors ligne
        } else if (erreur.status === 401 && !options.silencieux) {
          this.db.auth.signOut({ scope: 'local' });
          this.router.navigate(['/connexion']);
        } else {
          this.messages.add({ severity: 'error', summary: 'Oups', detail: erreur.error?.message });
        }
        return throwError(() => erreur);
      }),
    );
  }
}

export function versObjectif(o: ObjectifPerso, jour = aujourdhui()): Objectif {
  return {
    id: o.id,
    nom: o.nom,
    categorie: o.categorie,
    typeFrequence: o.typeFrequence,
    cible: o.cible,
    heure: o.heure,
    couleur: o.couleur,
    archive: o.archive,
    dateCreation: o.dateCreation,
    progression: progression(o, jour),
    mesure: o.mesure ?? 'AUCUNE',
    objectifQuantite: o.objectifQuantite ?? undefined,
    rappelAuto: o.rappelAuto,
    heureHabituelle: heureHabituelle(o) ?? undefined,
    heureRappel: heureRappel(o),
    partage: o.codePartage !== null,
    suggestion: suggestion(o, jour) ?? undefined,
  };
}

function versValidation(c: Coche): Validation {
  const v: Validation = { date: c.jour, quantite: c.quantite ?? undefined, heure: c.heure ?? undefined };
  if (c.typeSeance || c.dureeMinutes || c.ressenti) {
    v.sport = {
      typeSeance: (c.typeSeance as never) ?? undefined,
      dureeMinutes: (c.dureeMinutes as never) ?? undefined,
      ressenti: (c.ressenti as never) ?? undefined,
    };
  }
  if (c.ponctualite || c.reveil) {
    v.sommeil = { ponctualite: (c.ponctualite as never) ?? undefined, reveil: (c.reveil as never) ?? undefined };
  }
  return v;
}

function reglages(s: ObjectifSaisie): ReglagesObjectif {
  if (!s.nom?.trim()) throw new Error('Le nom est obligatoire');
  const chiffre = s.mesure && s.mesure !== 'AUCUNE' ? s.mesure : null;
  return {
    nom: s.nom.trim(),
    categorie: s.categorie,
    type_frequence: s.typeFrequence,
    cible: s.typeFrequence === 'QUOTIDIEN' ? 7 : s.cible,
    heure: s.heure,
    couleur: s.couleur ?? '#ffffff',
    mesure: chiffre,
    objectif_quantite: chiffre && s.objectifQuantite && s.objectifQuantite > 0 ? s.objectifQuantite : null,
    rappel_auto: s.categorie !== 'SOMMEIL' && !!s.rappelAuto,
  };
}

@Injectable({ providedIn: 'root' })
export class ObjectifsService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  listerObjectifs(archives = false): Observable<Objectif[]> {
    return this.erreurs.appel(async () => (await this.depot.lister(archives)).map((o) => versObjectif(o)));
  }

  lireObjectif(id: number): Observable<Objectif> {
    return this.erreurs.appel(async () => versObjectif(await this.depot.lire(id)));
  }

  creerObjectif(saisie: ObjectifSaisie): Observable<Objectif> {
    return this.erreurs.appel(async () =>
      versObjectif(await this.depot.creer({ ...reglages(saisie), date_creation: aujourdhui() })),
    );
  }

  modifierObjectif(id: number, saisie: ObjectifSaisie): Observable<Objectif> {
    return this.erreurs.appel(async () => {
      const avant = await this.depot.lire(id);
      const r = reglages(saisie);
      const cibleChangee = r.cible !== avant.cible || r.type_frequence !== avant.typeFrequence;
      return versObjectif(await this.depot.modifier(id, cibleChangee ? { ...r, cible_depuis: aujourdhui() } : r));
    });
  }

  archiverObjectif(id: number): Observable<Objectif> {
    return this.erreurs.appel(async () => versObjectif(await this.depot.modifier(id, { archive: true })));
  }

  restaurerObjectif(id: number): Observable<Objectif> {
    return this.erreurs.appel(async () => versObjectif(await this.depot.modifier(id, { archive: false })));
  }

  validerObjectif(id: number, saisie: ValidationSaisie): Observable<Objectif> {
    return this.erreurs.appel(async () => {
      const o = await this.depot.lire(id);
      const details: DetailsCoche = { ...saisie.sport, ...saisie.sommeil };
      const c = coche(o, saisie.date ?? aujourdhui(), details, saisie.quantite, maintenant());
      await this.depot.enregistrerCoche(id, c);
      o.coches = [...o.coches.filter((x) => x.jour !== c.jour), c];
      return versObjectif(o);
    });
  }

  annulerValidation(id: number, date: string): Observable<Objectif> {
    return this.erreurs.appel(async () => {
      await this.depot.supprimerCoche(id, date);
      return versObjectif(await this.depot.lire(id));
    });
  }

  historiqueObjectif(id: number, mois?: string): Observable<Historique> {
    return this.erreurs.appel(async () => {
      const h = historique(await this.depot.lire(id), mois ?? aujourdhui().slice(0, 7), aujourdhui());
      return { ...h, validations: h.coches.map(versValidation) };
    });
  }

  statistiquesObjectif(id: number): Observable<Statistiques> {
    return this.erreurs.appel(async () => statistiques(await this.depot.lire(id), aujourdhui()));
  }
}

@Injectable({ providedIn: 'root' })
export class BilanService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  /** Sans jour : la semaine en cours le dimanche, la semaine dernière les autres jours. */
  bilanSemaine(jour?: string): Observable<Bilan> {
    return this.erreurs.appel(async () => {
      const auj = aujourdhui();
      let cible = jour ?? (estDimanche(auj) ? auj : ajouterJours(lundiDe(auj), -7));
      if (lundiDe(cible) > auj) cible = auj;
      return bilan(await this.depot.lister(false), cible, auj);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class RappelsService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  prochainsRappels(jours = 7): Observable<Rappel[]> {
    return this.erreurs.appel(async () => tousLesRappels(await this.depot.lister(false), maintenant(), jours), {
      silencieux: true,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class BinomesService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  partagerObjectif(id: number): Observable<Partage> {
    return this.erreurs.appel(() => this.depot.partager(id));
  }

  listerBinomes(): Observable<ObjectifSuivi[]> {
    return this.erreurs.appel(async () =>
      (await this.depot.suivis()).map((o) => ({
        objectifId: o.id,
        nom: o.nom,
        ami: o.ami,
        categorie: o.categorie,
        progression: progression(o, aujourdhui()),
      })),
    );
  }

  rejoindreBinome(code: CodeBinome): Observable<ObjectifSuivi> {
    return this.erreurs.appel(async () => {
      const id = await this.depot.rejoindre(code.code);
      const suivi = (await this.depot.suivis()).find((o) => o.id === id)!;
      return { objectifId: id, nom: suivi.nom, ami: suivi.ami, categorie: suivi.categorie, progression: progression(suivi, aujourdhui()) };
    });
  }

  quitterBinome(objectifId: number): Observable<void> {
    return this.erreurs.appel(() => this.depot.quitter(objectifId));
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(SupabaseService).client;
  private readonly erreurs = inject(Erreurs);

  inscription(identifiants: Identifiants): Observable<Session> {
    return this.erreurs.appel(async () => {
      const { data, error } = await this.db.auth.signUp({
        email: identifiants.email,
        password: identifiants.motDePasse,
        options: { emailRedirectTo: SUPABASE.confirmation },
      });
      if (error) throw error;
      if (!data.session) throw { code: 'email_not_confirmed', message: '' };
      return { token: data.session.access_token, email: data.session.user.email ?? identifiants.email };
    });
  }

  connexion(identifiants: Identifiants): Observable<Session> {
    return this.erreurs.appel(async () => {
      const { data, error } = await this.db.auth.signInWithPassword({
        email: identifiants.email,
        password: identifiants.motDePasse,
      });
      if (error) throw error;
      return { token: data.session.access_token, email: data.session.user.email ?? identifiants.email };
    }, { silencieux: true });
  }
}

export { HttpErrorResponse };
