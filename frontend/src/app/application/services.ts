import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, defer, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SUPABASE } from '../supabase.config';
import type {
  Badge,
  Bilan,
  CreationFoyer,
  Encouragement,
  Foyer,
  Profil,
  ReglagesFoyer,
  RejoindreFoyer,
  TypeEncouragement,
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
import { profil } from '../domaine/recompenses';
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
        if (erreur.status !== 0 && !(e as { code?: string })?.code) console.error(e);
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

  /** Dernier jour coché (jusqu'à aujourd'hui), tous objectifs actifs confondus. */
  derniereCoche(): Observable<string | null> {
    return this.erreurs.appel(async () => {
      const jours = (await this.depot.lister(false)).flatMap((o) => o.coches.map((c) => c.jour)).filter((j) => j <= aujourdhui());
      return jours.length ? jours.reduce((a, b) => (a > b ? a : b)) : null;
    }, { silencieux: true });
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

  /** Entrer dans l'app avec le code du foyer et son prénom, sans email (compte anonyme Supabase). */
  rejoindreSansCompte(code: string, prenom: string): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db.auth.signInAnonymously();
      if (error) {
        if (/anonymous/i.test(error.message)) {
          throw { code: 'anonyme_desactive', message: "L'entrée par code n'est pas encore activée. Demande à un parent de créer un compte avec email." };
        }
        throw error;
      }
      const rejoint = await this.db.rpc('rejoindre_foyer', { p_code: code, p_prenom: prenom, p_parent: false });
      if (rejoint.error) {
        // Code faux : on ne garde pas un compte vide
        await this.db.auth.signOut({ scope: 'local' });
        throw rejoint.error;
      }
    });
  }

  /** Ajoute un email et un mot de passe à un compte entré par code, pour le retrouver sur un autre téléphone. */
  securiser(identifiants: Identifiants): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db.auth.updateUser(
        { email: identifiants.email, password: identifiants.motDePasse },
        { emailRedirectTo: SUPABASE.confirmation },
      );
      if (error) throw error;
    });
  }
}

/** Points, niveau et badges, calculés à partir de tous les objectifs (archivés compris). */
@Injectable({ providedIn: 'root' })
export class ProfilService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);
  private readonly db = inject(SupabaseService).client;

  profil(): Observable<Profil> {
    return this.erreurs.appel(async () => {
      const [objectifs, membre] = await Promise.all([
        this.depot.listerTout(),
        this.db.from('foyer_membre').select('prenom').maybeSingle(),
      ]);
      return profil(objectifs, aujourdhui(), membre.data?.prenom ?? undefined);
    }, { silencieux: true });
  }
}

export type { Badge };

/** Le Foyer : la famille qui avance ensemble. */
@Injectable({ providedIn: 'root' })
export class FoyerService {
  private readonly erreurs = inject(Erreurs);
  private readonly db = inject(SupabaseService).client;

  /** Le foyer de l'utilisateur et sa semaine, ou null s'il n'en a pas. */
  foyer(): Observable<Foyer | null> {
    return this.erreurs.appel(async () => {
      const { data: f, error } = await this.db.from('foyer').select('id, nom, code, recompense, objectif_semaine').maybeSingle();
      if (error) throw error;
      if (!f) return null;
      const [semaine, encouragements] = await Promise.all([
        this.db.rpc('foyer_semaine', { p_lundi: lundiDe(aujourdhui()) }),
        this.db.from('encouragement').select('id, de, type').eq('vu', false).eq('a', (await this.db.auth.getUser()).data.user?.id ?? ''),
      ]);
      if (semaine.error) throw semaine.error;
      const membres = semaine.data.map((m) => ({
        id: m.utilisateur_id, prenom: m.prenom, parent: m.parent, moi: m.moi, coches: m.coches, objectifs: m.objectifs, tenus: m.tenus,
      }));
      const prenoms = new Map(membres.map((m) => [m.id, m.prenom]));
      return {
        nom: f.nom,
        code: f.code,
        recompense: f.recompense ?? undefined,
        objectifSemaine: f.objectif_semaine,
        cochesSemaine: membres.reduce((t, m) => t + m.coches, 0),
        parent: membres.some((m) => m.moi && m.parent),
        membres,
        encouragements: (encouragements.data ?? []).map(
          (e): Encouragement => ({ id: e.id, de: prenoms.get(e.de) ?? 'Quelqu\'un', type: e.type as TypeEncouragement }),
        ),
      };
    }, { silencieux: true });
  }

  creer(saisie: CreationFoyer): Observable<string> {
    return this.erreurs.appel(async () => {
      const { data, error } = await this.db.rpc('creer_foyer', { p_nom: saisie.nom, p_prenom: saisie.prenom });
      if (error) throw error;
      return data;
    });
  }

  rejoindre(saisie: RejoindreFoyer, parent = false): Observable<number> {
    return this.erreurs.appel(async () => {
      const { data, error } = await this.db.rpc('rejoindre_foyer', { p_code: saisie.code, p_prenom: saisie.prenom, p_parent: parent });
      if (error) throw error;
      return data;
    });
  }

  regler(reglages: ReglagesFoyer): Observable<void> {
    return this.erreurs.appel(async () => {
      const { data: id } = await this.db.rpc('mon_foyer');
      const { error } = await this.db
        .from('foyer')
        .update({ recompense: reglages.recompense?.trim() || null, objectif_semaine: reglages.objectifSemaine })
        .eq('id', id ?? 0);
      if (error) throw error;
    });
  }

  encourager(a: string, type: TypeEncouragement): Observable<void> {
    return this.erreurs.appel(async () => {
      const { data: id } = await this.db.rpc('mon_foyer');
      const { error } = await this.db.from('encouragement').insert({ foyer_id: id ?? 0, a, type });
      if (error) throw error;
    });
  }

  marquerVus(ids: number[]): Observable<void> {
    return this.erreurs.appel(async () => {
      if (ids.length === 0) return;
      const { error } = await this.db.from('encouragement').update({ vu: true }).in('id', ids);
      if (error) throw error;
    }, { silencieux: true });
  }

  quitter(): Observable<void> {
    return this.erreurs.appel(async () => {
      const { data } = await this.db.auth.getUser();
      const { error } = await this.db.from('foyer_membre').delete().eq('utilisateur_id', data.user?.id ?? '');
      if (error) throw error;
    });
  }
}

export { HttpErrorResponse };
