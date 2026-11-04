import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Ami, CodeAmi, ObjectifCommun, ObjectifSuivi } from '../../api/generated';
import { AmisService } from '../../application/services';
import { lienAmi } from '../../core/invitation.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { Flamme } from '../../shared/flamme';

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
  imports: [ReactiveFormsModule, RouterLink, FormlyForm, Button, Dialog, Flamme],
  template: `
    @if (actifs().length > 0 || envoyees().length > 0) {
      <section class="binomes" aria-label="À deux">
        <h2 class="titre-section">À deux</h2>
        @for (c of actifs(); track c.id) {
          <a class="binome commun" [routerLink]="['/objectifs', c.monObjectif]">
            <div class="ligne-haut">
              <span class="nom">{{ c.nom }} <small>· avec {{ c.ami }}</small></span>
              <app-flamme [valeur]="c.flamme ?? 0" [unite]="c.uniteSerie ?? 'JOURS'" />
            </div>
            <div class="duo">
              <span [class.fait]="(c.moi ?? 0) >= (c.objectifPeriode ?? 1)">
                <i class="pi" [class.pi-check-circle]="(c.moi ?? 0) >= (c.objectifPeriode ?? 1)" [class.pi-circle]="(c.moi ?? 0) < (c.objectifPeriode ?? 1)"></i>
                Toi {{ c.typeFrequence === 'QUOTIDIEN' ? '' : (c.moi ?? 0) + '/' + c.objectifPeriode }}
              </span>
              <span [class.fait]="(c.duAmi ?? 0) >= (c.objectifPeriode ?? 1)">
                <i class="pi" [class.pi-check-circle]="(c.duAmi ?? 0) >= (c.objectifPeriode ?? 1)" [class.pi-circle]="(c.duAmi ?? 0) < (c.objectifPeriode ?? 1)"></i>
                {{ c.ami }} {{ c.typeFrequence === 'QUOTIDIEN' ? '' : (c.duAmi ?? 0) + '/' + c.objectifPeriode }}
              </span>
            </div>
            <small class="aide">{{ etatCommun(c) }}</small>
          </a>
        }
        @for (c of envoyees(); track c.id) {
          <div class="binome commun en-attente">
            <div class="ligne-haut">
              <span class="nom">{{ c.nom }} <small>· {{ c.demande ? 'demande envoyée' : 'invitation envoyée' }} à {{ c.ami }}</small></span>
              <button type="button" class="lien-details" (click)="quitterCommun(c)">Annuler</button>
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
            <span class="nom-ami">{{ a.nom }}</span>
            <small>{{ a.objectifs.length === 0 ? 'aucun objectif visible' : a.objectifs.length + ' objectif(s) visible(s)' }}</small>
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
                  <div class="segments" aria-hidden="true">
                    @for (plein of segments(b); track $index) {
                      <i [class.plein]="plein"></i>
                    }
                  </div>
                  <div class="ligne-bas">
                    <small>{{ etat(b) }}</small>
                    <span class="compteur">{{ b.progression.realisees }}<span>/{{ b.progression.cible }}</span></span>
                  </div>
                  @if (demandeEnvoyee(a, b)) {
                    <small class="aide"><i class="pi pi-clock"></i> Demande envoyée, {{ a.nom }} doit accepter</small>
                  } @else if (!b.enCommun) {
                    <p-button
                      [label]="'Proposer à ' + a.nom + ' de le faire ensemble'"
                      icon="pi pi-users"
                      [text]="true"
                      size="small"
                      [loading]="rejoint() === b.objectifId"
                      (onClick)="rejoindre(b)"
                    />
                  } @else {
                    <small class="aide"><i class="pi pi-users"></i> Déjà fait à deux</small>
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
        <p class="aide">Ajoute un ami avec son identifiant : vous verrez vos objectifs visibles et pourrez en faire à deux.</p>
      }

      <p-button label="Ajouter un ami" icon="pi pi-user-plus" [outlined]="true" (onClick)="ouvrir()" />
    </section>

    <p-dialog
      header="Ajouter un ami"
      [visible]="ajout()"
      (visibleChange)="!$event && ajout.set(false)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Tape son identifiant, affiché sur sa page Profil.</p>
      <form [formGroup]="formCode" (ngSubmit)="envoyer()">
        <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="ajout.set(false)" />
          <p-button type="submit" label="Ajouter" />
        </div>
      </form>
      @if (pseudo(); as p) {
        <div class="partage mon-code lien-ami">
          <p class="etiquette">Ou envoie-lui ton lien</p>
          <div class="code">
            <strong>&#64;{{ p }}</strong>
            <p-button [label]="copie() ? 'Copié' : 'Partager'" icon="pi pi-share-alt" [outlined]="true" (onClick)="partager(p)" />
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class Amis implements OnInit {
  private readonly api = inject(AmisService);
  protected readonly amis = signal<Ami[]>(cache.amis);
  protected readonly communs = signal<ObjectifCommun[]>(cache.communs);
  protected readonly actifs = computed(() => this.communs().filter((c) => c.statut === 'ACTIF'));
  protected readonly envoyees = computed(() => this.communs().filter((c) => c.statut === 'ENVOYEE'));
  protected readonly pseudo = this.api.pseudo;
  protected readonly copie = signal(false);
  protected readonly ajout = signal(false);
  /** Ami déplié (un seul à la fois). */
  protected readonly ouvert = signal<string | null>(null);
  /** Objectif d'ami qu'on est en train de rejoindre. */
  protected readonly rejoint = signal<number | null>(null);
  /** Ami pour qui on confirme le retrait. */
  protected readonly aRetirer = signal<string | null>(null);
  protected formCode = new FormGroup({});
  protected modelCode: Partial<CodeAmi> = {};
  protected readonly champsCode = inject(SchemaFormService).champs('CodeAmi', {
    code: { props: { placeholder: '@lea', attributes: { autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false' } } },
  });

  ngOnInit(): void {
    this.charger();
    if (this.pseudo() === undefined) this.api.chargerPseudo().subscribe({ error: () => undefined });
  }

  private charger(): void {
    this.api.lister().subscribe({ next: (l) => this.amis.set((cache.amis = l)), error: () => undefined });
    this.api.communs().subscribe({ next: (l) => this.communs.set((cache.communs = l)), error: () => undefined });
  }

  protected basculer(id: string): void {
    this.aRetirer.set(null);
    this.ouvert.set(this.ouvert() === id ? null : id);
  }

  protected segments(b: ObjectifSuivi): boolean[] {
    return Array.from({ length: b.progression.cible }, (_, i) => i < b.progression.realisees);
  }

  protected etat(b: ObjectifSuivi): string {
    if (b.progression.faitAujourdhui) return "Fait aujourd'hui";
    return b.progression.atteint ? 'Semaine réussie' : "Pas encore aujourd'hui";
  }

  protected frequence(c: ObjectifCommun): string {
    return c.typeFrequence === 'QUOTIDIEN' ? 'tous les jours' : `${c.cible} fois par semaine`;
  }

  protected etatCommun(c: ObjectifCommun): string {
    const objectif = c.objectifPeriode ?? 1;
    const moi = (c.moi ?? 0) >= objectif;
    const ami = (c.duAmi ?? 0) >= objectif;
    const periode = c.typeFrequence === 'QUOTIDIEN' ? "aujourd'hui" : 'cette semaine';
    if (moi && ami) return `Fait à deux ${periode} : la flamme commune est sauvée.`;
    if (moi) return `À ${c.ami} de jouer ${periode}, sinon la flamme commune retombe.`;
    if (ami) return `${c.ami} l'a fait. À toi ${periode}, sinon la flamme commune retombe.`;
    return `Aucun de vous deux ${periode} pour l'instant.`;
  }

  async partager(pseudo: string): Promise<void> {
    const lien = lienAmi(pseudo);
    const texte = `Ajoute-moi en ami sur Équinoxe : ${lien} (mon identifiant : @${pseudo})`;
    try {
      if (navigator.share) {
        await navigator.share({ text: texte });
        return;
      }
      await navigator.clipboard.writeText(lien);
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2000);
    } catch {
      /* partage annulé */
    }
  }

  ouvrir(): void {
    this.formCode = new FormGroup({});
    this.modelCode = {};
    this.ajout.set(true);
  }

  envoyer(): void {
    this.formCode.markAllAsTouched();
    const code = this.modelCode.code?.trim();
    if (this.formCode.invalid || !code) return;
    this.api.ajouter(code).subscribe(() => {
      this.ajout.set(false);
      this.charger();
    });
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
    return this.envoyees().some((c) => c.demande && c.amiId === a.id && c.nom === b.nom);
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

  quitterCommun(c: ObjectifCommun): void {
    this.api.quitterCommun(c.id).subscribe(() => this.communs.update((l) => l.filter((x) => x.id !== c.id)));
  }
}
