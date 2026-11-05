import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Ami, ObjectifCommun, ObjectifSuivi } from '../../api/generated';
import { AmisService } from '../../application/services';
import { Flamme } from '../../shared/flamme';
import { Avatar } from '../../shared/avatar';
import { PhotosService } from '../../core/photos.service';
import { SessionService } from '../../core/session.service';

/** Dernières données connues : l'onglet s'affiche tout de suite au retour, puis se met à jour. */
const cache: { amis: Ami[]; communs: ObjectifCommun[] } = { amis: [], communs: [] };

/** À la déconnexion : rien ne doit rester du compte précédent. */
export function viderCacheAmis(): void {
  cache.amis = [];
  cache.communs = [];
}

/**
 * Les amis hors groupe : objectifs faits à deux (flamme commune), puis chaque ami et ses objectifs
 * visibles, dans un menu dépliant. Les invitations reçues sont dans Notifications (la cloche).
 */
@Component({
  selector: 'app-amis',
  imports: [RouterLink, Button, Flamme, Avatar],
  template: `
    @if (actifs().length > 0 || enAttente().length > 0) {
      <section class="binomes" aria-label="Ensemble">
        <h2 class="titre-section">Ensemble</h2>
        @for (c of actifs(); track c.id) {
          <a class="binome commun" [routerLink]="['/objectifs', c.monObjectif]">
            <div class="ligne-haut">
              <span class="nom">{{ c.nom }}</span>
              <app-flamme [valeur]="c.flamme ?? 0" [unite]="c.uniteSerie ?? 'JOURS'" />
            </div>
            <!-- Les photos de chacun : un trait plein autour de ceux qui ont fait leur part -->
            <div class="duo">
              <span class="duo-membre">
                <app-avatar [id]="moi()" nom="Moi" [taille]="2" [fait]="(c.moi ?? 0) >= (c.objectifPeriode ?? 1)" />
                @if (c.typeFrequence !== 'QUOTIDIEN') { <small>{{ c.moi ?? 0 }}/{{ c.objectifPeriode }}</small> }
              </span>
              @for (m of actifsDe(c); track m.id) {
                <span class="duo-membre">
                  <app-avatar [id]="m.id" [nom]="m.nom" [taille]="2" [fait]="(m.fait ?? 0) >= (c.objectifPeriode ?? 1)" />
                  @if (c.typeFrequence !== 'QUOTIDIEN') { <small>{{ m.fait ?? 0 }}/{{ c.objectifPeriode }}</small> }
                </span>
              }
            </div>
          </a>
        }
        @for (e of enAttente(); track e.commun.id + (e.membre ?? '')) {
          <div class="binome commun en-attente">
            <div class="ligne-haut">
              <span class="nom">{{ e.commun.nom }} <small>· {{ e.texte }}</small></span>
              <button type="button" class="lien-details" (click)="annuler(e.commun, e.membre)">Annuler</button>
            </div>
          </div>
        }
      </section>
    }

    <section class="binomes" aria-label="Amis">
      <h2 class="titre-section">Amis</h2>
      @for (a of amis(); track a.id) {
        <div class="ami" [class.ouvert]="ouvert() === a.id">
          <button type="button" class="tete-ami" [attr.aria-expanded]="ouvert() === a.id" (click)="basculer(a.id)">
            <app-avatar [id]="a.id" [nom]="a.nom" [taille]="2" />
            <span class="nom-ami">{{ a.nom }}</span>
            <small>{{ a.objectifs.length === 0 ? 'aucun objectif visible' : a.objectifs.length + (a.objectifs.length > 1 ? ' objectifs visibles' : ' objectif visible') }}</small>
            <i class="pi pi-chevron-down"></i>
          </button>
          @if (ouvert() === a.id) {
            <div class="corps-ami">
              @for (b of a.objectifs; track b.objectifId) {
                <div class="binome">
                  <div class="ligne-haut">
                    <span class="nom">{{ b.nom }}</span>
                    <app-flamme [valeur]="b.progression.serie" [unite]="b.progression.uniteSerie" />
                  </div>
                  @if (demandeEnvoyee(a, b)) {
                    <small class="aide"><i class="pi pi-clock"></i> Demande envoyée</small>
                  } @else if (!b.enCommun) {
                    <p-button
                      label="Le faire ensemble"
                      icon="pi pi-users"
                      [text]="true"
                      size="small"
                      [loading]="rejoint() === b.objectifId"
                      (onClick)="rejoindre(b)"
                    />
                  }
                </div>
              } @empty {
                <small class="aide">{{ a.nom }} n'a pas encore rendu d'objectif visible.</small>
              }
              <div class="retrait">
                @if (aRetirer() === a.id) {
                  <span>Retirer {{ a.nom }} ? Vos objectifs communs s'arrêteront.</span>
                  <div class="actions">
                    <p-button label="Annuler" [text]="true" severity="secondary" size="small" (onClick)="aRetirer.set(null)" />
                    <p-button label="Retirer" severity="danger" size="small" (onClick)="retirer(a)" />
                  </div>
                } @else {
                  <p-button label="Retirer de mes amis" icon="pi pi-user-minus" [outlined]="true" severity="secondary" size="small" (onClick)="aRetirer.set(a.id)" />
                }
              </div>
            </div>
          }
        </div>
      } @empty {
        <p class="aide">Pas encore d'ami. <a routerLink="/profil" [queryParams]="{ ajouter: 1 }">Ajoute-en un</a> avec son identifiant : vous verrez vos objectifs visibles et pourrez en faire ensemble.</p>
      }

    </section>
  `,
})
export class Amis implements OnInit {
  private readonly api = inject(AmisService);
  private readonly photos = inject(PhotosService);
  private readonly session = inject(SessionService);
  protected readonly moi = computed(() => this.session.utilisateur()?.id);
  protected readonly amis = signal<Ami[]>(cache.amis);
  protected readonly communs = signal<ObjectifCommun[]>(cache.communs);
  protected readonly actifs = computed(() => this.communs().filter((c) => c.statut === 'ACTIF'));
  protected readonly envoyees = computed(() => this.communs().filter((c) => c.statut === 'ENVOYEE'));
  /** Ce qui attend une réponse : mes demandes pour rejoindre, et les invitations que j'ai envoyées. */
  protected readonly enAttente = computed(() => [
    ...this.envoyees().map((commun) => ({ commun, membre: undefined as string | undefined, texte: `demande envoyée à ${commun.createur}` })),
    ...this.actifs().flatMap((commun) =>
      commun.membres.filter((m) => m.statut === 'INVITE').map((m) => ({ commun, membre: m.id as string | undefined, texte: `invitation envoyée à ${m.nom}` })),
    ),
  ]);
  protected actifsDe(c: ObjectifCommun) {
    return c.membres.filter((m) => m.statut === 'ACTIF');
  }
  /** Ami déplié (un seul à la fois). */
  protected readonly ouvert = signal<string | null>(null);
  /** Objectif d'ami qu'on est en train de rejoindre. */
  protected readonly rejoint = signal<number | null>(null);
  /** Ami pour qui on confirme le retrait. */
  protected readonly aRetirer = signal<string | null>(null);

  ngOnInit(): void {
    this.charger();
    void this.photos.charger(true);
  }

  private charger(): void {
    this.api.lister().subscribe({ next: (l) => this.amis.set((cache.amis = l)), error: () => undefined });
    this.api.communs().subscribe({ next: (l) => this.communs.set((cache.communs = l)), error: () => undefined });
  }

  protected basculer(id: string): void {
    this.aRetirer.set(null);
    this.ouvert.set(this.ouvert() === id ? null : id);
  }

  protected frequence(c: ObjectifCommun): string {
    return c.typeFrequence === 'QUOTIDIEN' ? 'tous les jours' : `${c.cible} fois par semaine`;
  }

  retirer(a: Ami): void {
    this.api.retirer(a.id).subscribe(() => {
      this.ouvert.set(null);
      this.aRetirer.set(null);
      this.charger();
    });
  }

  /** Demande déjà envoyée à cet ami pour cet objectif (en attente de sa réponse). */
  protected demandeEnvoyee(a: Ami, b: ObjectifSuivi): boolean {
    return this.envoyees().some((c) => c.nom === b.nom && c.membres.some((m) => m.id === a.id));
  }

  /** « Le faire avec Léa » : envoie une demande ; à son accord, mon objectif est créé et la flamme commune démarre. */
  rejoindre(b: ObjectifSuivi): void {
    this.rejoint.set(b.objectifId);
    this.api.rejoindreObjectif(b.objectifId).subscribe({
      next: () => {
        this.rejoint.set(null);
        this.charger();
      },
      error: () => this.rejoint.set(null),
    });
  }

  annuler(c: ObjectifCommun, membre?: string): void {
    this.api.quitterCommun(c.id, membre).subscribe(() => this.charger());
  }
}
