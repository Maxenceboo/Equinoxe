import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, defer, from, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
  Ami,
  ObjectifCommun,
  StatutCommun,
  Historique,
  Identifiants,
  Objectif,
  ObjectifSaisie,
  Rappel,
  Statistiques,
  Validation,
  ValidationSaisie,
} from '../api/generated';
import { bilan } from '../domaine/bilan';
import { serieCommune } from '../domaine/commun';
import { suggestion } from '../domaine/conseil-cible';
import { estDimanche, lundiDe, ajouterJours } from '../domaine/jours';
import { Coche, DetailsCoche, Maintenant, ObjectifPerso } from '../domaine/modele';
import { coche, heureHabituelle, heureRappel } from '../domaine/objectif';
import { historique, progression } from '../domaine/progression';
import { profil } from '../domaine/recompenses';
import { COUT_JOKER, CodePalette, palette } from '../domaine/boutique';
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
    visibleAmis: o.visibleAmis ?? false,
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
    visible_amis: !!s.visibleAmis,
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

/** Les amis : on s'ajoute avec un code perso et on voit les objectifs visibles de l'autre. */
@Injectable({ providedIn: 'root' })
export class AmisService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  monCode(): Observable<string> {
    return this.erreurs.appel(() => this.depot.monCodeAmi(), { silencieux: true });
  }

  lister(): Observable<Ami[]> {
    return this.erreurs.appel(async () =>
      (await this.depot.amis()).map((a) => ({
        id: a.id,
        nom: a.nom,
        objectifs: a.objectifs.map((o) => ({
          objectifId: o.id,
          nom: o.nom,
          ami: a.nom,
          categorie: o.categorie,
          progression: progression(o, aujourdhui()),
          enCommun: o.enCommun,
        })),
      })),
      { silencieux: true },
    );
  }

  /** Ajoute l'ami du code et renvoie son nom. */
  ajouter(code: string): Observable<string> {
    return this.erreurs.appel(() => this.depot.ajouterAmi(code));
  }

  retirer(id: string): Observable<void> {
    return this.erreurs.appel(() => this.depot.retirerAmi(id));
  }

  /** Objectifs communs (actifs et invitations), avec la flamme commune calculée. */
  communs(): Observable<ObjectifCommun[]> {
    return this.erreurs.appel(async () =>
      (await this.depot.communs()).map((c): ObjectifCommun => {
        const commun: ObjectifCommun = {
          id: c.id,
          statut: c.statut as StatutCommun,
          ami: c.ami,
          amiId: c.ami_id,
          monObjectif: c.mon_objectif ?? undefined,
          nom: c.nom,
          categorie: c.categorie as ObjectifCommun['categorie'],
          typeFrequence: c.type_frequence as ObjectifCommun['typeFrequence'],
          cible: c.cible,
          heure: c.heure,
        };
        if (c.statut !== 'ACTIF' || !c.depuis) return commun;
        const s = serieCommune(
          { quotidien: c.type_frequence === 'QUOTIDIEN', cible: c.cible, depuis: c.depuis, mesJours: c.mes_jours, joursAmi: c.jours_ami },
          aujourdhui(),
        );
        return { ...commun, flamme: s.enCours, record: s.record, uniteSerie: s.unite, moi: s.moi, duAmi: s.ami, objectifPeriode: s.objectif };
      }),
      { silencieux: true },
    );
  }

  /** Fait à deux l'objectif visible d'un ami ; renvoie l'identifiant de mon nouvel objectif. */
  rejoindreObjectif(objectifId: number): Observable<number> {
    return this.erreurs.appel(() => this.depot.rejoindreObjectifAmi(objectifId));
  }

  inviterCommun(objectifId: number, amiId: string): Observable<void> {
    return this.erreurs.appel(() => this.depot.inviterCommun(objectifId, amiId));
  }

  /** Accepte l'invitation et renvoie l'identifiant de mon nouvel objectif. */
  accepterCommun(id: number): Observable<number> {
    return this.erreurs.appel(() => this.depot.accepterCommun(id));
  }

  quitterCommun(id: number): Observable<void> {
    return this.erreurs.appel(() => this.depot.quitterCommun(id));
  }

  quiVoit(objectifId: number): Observable<string[]> {
    return this.erreurs.appel(() => this.depot.amisQuiVoient(objectifId), { silencieux: true });
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

  /** Supprime définitivement le compte et toutes ses données (objectifs, coches, groupes, achats). */
  supprimerCompte(): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db.rpc('supprimer_mon_compte');
      if (error) throw error;
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
  /** Dernier profil connu : les écrans l'affichent tout de suite, puis il se met à jour en fond. */
  readonly dernier = signal<Profil | null>(null);

  profil(): Observable<Profil> {
    return this.erreurs.appel(async () => {
      const moi = (await this.db.auth.getSession()).data.session?.user.id ?? '';
      const [objectifs, membre, achats] = await Promise.all([
        this.depot.listerTout(),
        // Mon prénom dans mon premier groupe (la table montre aussi les autres membres)
        this.db.from('foyer_membre').select('prenom').eq('utilisateur_id', moi).order('depuis').limit(1).maybeSingle(),
        this.depot.achats(),
      ]);
      return profil(objectifs, aujourdhui(), membre.data?.prenom ?? undefined, {
        jokers: achats.jokers,
        palettes: achats.palettes as CodePalette[],
      });
    }, { silencieux: true }).pipe(tap((p) => this.dernier.set(p)));
  }
}

export type { Badge };

/** Boutique : dépenser ses points. Le solde est vérifié avant chaque achat. */
@Injectable({ providedIn: 'root' })
export class BoutiqueService {
  private readonly depot = inject(DepotObjectifs);
  private readonly erreurs = inject(Erreurs);

  /** Un joker en plus ce mois-ci pour cet objectif. */
  acheterJoker(objectifId: number, soldeActuel: number): Observable<void> {
    return this.erreurs.appel(async () => {
      if (soldeActuel < COUT_JOKER) throw { code: 'solde', message: 'Pas assez de points pour un joker.' };
      await this.depot.acheterJoker(objectifId, aujourdhui().slice(0, 7));
    });
  }

  acheterPalette(code: CodePalette, soldeActuel: number): Observable<void> {
    return this.erreurs.appel(async () => {
      if (soldeActuel < palette(code).cout) throw { code: 'solde', message: 'Pas assez de points pour cette palette.' };
      await this.depot.acheterPalette(code);
    });
  }
}

/** Les groupes (famille, amis, collègues) : on peut être dans plusieurs. */
@Injectable({ providedIn: 'root' })
export class FoyerService {
  private readonly erreurs = inject(Erreurs);
  private readonly db = inject(SupabaseService).client;

  /** Tous mes groupes avec leur semaine, du plus ancien au plus récent. */
  foyers(): Observable<Foyer[]> {
    return this.erreurs.appel(async () => {
      const { data, error } = await this.db.from('foyer').select('id, nom, code, recompense, objectif_semaine, cree_le').order('cree_le');
      if (error) throw error;
      return Promise.all(data.map((f) => this.semaine(f)));
    }, { silencieux: true });
  }

  /** Un groupe et sa semaine, ou null si on n'en fait pas partie. */
  foyer(id: number): Observable<Foyer | null> {
    return this.erreurs.appel(async () => {
      const { data: f, error } = await this.db.from('foyer').select('id, nom, code, recompense, objectif_semaine').eq('id', id).maybeSingle();
      if (error) throw error;
      return f ? this.semaine(f) : null;
    }, { silencieux: true });
  }

  private async semaine(f: { id: number; nom: string; code: string; recompense: string | null; objectif_semaine: number }): Promise<Foyer> {
    const { data, error } = await this.db.rpc('foyer_semaine', { p_foyer: f.id, p_lundi: lundiDe(aujourdhui()) });
    if (error) throw error;
    const membres = data.map((m) => ({
      id: m.utilisateur_id, prenom: m.prenom, parent: m.parent, moi: m.moi, coches: m.coches, objectifs: m.objectifs, tenus: m.tenus,
    }));
    return {
      id: f.id,
      nom: f.nom,
      code: f.code,
      recompense: f.recompense ?? undefined,
      objectifSemaine: f.objectif_semaine,
      cochesSemaine: membres.reduce((t, m) => t + m.coches, 0),
      parent: membres.some((m) => m.moi && m.parent),
      membres,
    };
  }

  /** Encouragements reçus et pas encore vus, avec le prénom de l'expéditeur. */
  encouragementsRecus(): Observable<Encouragement[]> {
    return this.erreurs.appel(async () => {
      const moi = (await this.db.auth.getSession()).data.session?.user.id ?? '';
      const { data, error } = await this.db.from('encouragement').select('id, de, foyer_id, type').eq('vu', false).eq('a', moi);
      if (error) throw error;
      if (data.length === 0) return [];
      const { data: membres } = await this.db.from('foyer_membre').select('foyer_id, utilisateur_id, prenom')
        .in('utilisateur_id', [...new Set(data.map((e) => e.de))]);
      const prenom = (foyer: number, de: string) =>
        membres?.find((m) => m.foyer_id === foyer && m.utilisateur_id === de)?.prenom ?? "Quelqu'un";
      return data.map((e): Encouragement => ({ id: e.id, de: prenom(e.foyer_id, e.de), type: e.type as TypeEncouragement }));
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

  regler(id: number, reglages: ReglagesFoyer): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db
        .from('foyer')
        .update({ recompense: reglages.recompense?.trim() || null, objectif_semaine: reglages.objectifSemaine })
        .eq('id', id);
      if (error) throw error;
    });
  }

  /** Un parent du groupe nomme un autre membre parent. */
  nommerParent(foyerId: number, membre: string): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db.rpc('nommer_parent', { p_foyer: foyerId, p_membre: membre });
      if (error) throw error;
    });
  }

  encourager(foyerId: number, a: string, type: TypeEncouragement): Observable<void> {
    return this.erreurs.appel(async () => {
      const { error } = await this.db.from('encouragement').insert({ foyer_id: foyerId, a, type });
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

  quitter(id: number): Observable<void> {
    return this.erreurs.appel(async () => {
      const moi = (await this.db.auth.getSession()).data.session?.user.id ?? '';
      const { error } = await this.db.from('foyer_membre').delete().eq('foyer_id', id).eq('utilisateur_id', moi);
      if (error) throw error;
    });
  }
}

export { HttpErrorResponse };
