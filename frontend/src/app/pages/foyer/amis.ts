import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Ami, CodeAmi, ObjectifCommun, ObjectifSuivi } from '../../api/generated';
import { AmisService } from '../../application/services';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { Flamme } from '../../shared/flamme';

/**
 * Les amis hors groupe : invitations à faire un objectif à deux, objectifs communs (flamme commune),
 * puis chaque ami et ses objectifs visibles, dans un menu dépliant.
 */
@Component({
  selector: 'app-amis',
  imports: [ReactiveFormsModule, RouterLink, FormlyForm, Button, Dialog, Flamme],
  template: `
    @for (c of recues(); track c.id) {
      <section class="invitation" aria-label="Invitation">
        <p><strong>{{ c.ami }}</strong> te propose de faire « {{ c.nom }} » ensemble, {{ frequence(c) }}.</p>
        <small class="aide">Vous aurez une flamme commune : elle ne monte que si vous le faites tous les deux.</small>
        <div class="actions">
          <p-button label="Refuser" [text]="true" severity="secondary" (onClick)="quitterCommun(c)" />
          <p-button label="On le fait ensemble" icon="pi pi-check" (onClick)="accepter(c)" />
        </div>
      </section>
    }

    @if (actifs().length > 0 || envoyees().length > 0) {
      <section class="binomes" aria-label="Objectifs communs">
        <h2 class="titre-section">Objectifs communs</h2>
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
              <span class="nom">{{ c.nom }} <small>· invitation envoyée à {{ c.ami }}</small></span>
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
        <p class="aide">Ajoute des amis avec leur code : tu verras leurs objectifs visibles, et vous pourrez faire des objectifs à deux. Tes objectifs privés restent privés.</p>
      }

      <div class="partage mon-code">
        <p class="etiquette">Mon code ami</p>
        @if (code(); as c) {
          <div class="code">
            <strong>{{ c }}</strong>
            <p-button [label]="copie() ? 'Copié' : 'Partager'" icon="pi pi-share-alt" [outlined]="true" (onClick)="partager(c)" />
          </div>
        }
        <small class="aide">Sur la page d'un objectif, tu peux le rendre visible par tes amis ou le faire avec l'un d'eux.</small>
      </div>
      <p-button label="Ajouter un ami avec son code" icon="pi pi-user-plus" [outlined]="true" (onClick)="ouvrir()" />
    </section>

    <p-dialog
      header="Ajouter un ami"
      [visible]="ajout()"
      (visibleChange)="!$event && ajout.set(false)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Demande à ton ami son code, affiché en bas de sa page Proches. Vous verrez chacun les objectifs visibles de l'autre.</p>
      <form [formGroup]="formCode" (ngSubmit)="envoyer()">
        <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="ajout.set(false)" />
          <p-button type="submit" label="Ajouter" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class Amis implements OnInit {
  private readonly api = inject(AmisService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);
  protected readonly amis = signal<Ami[]>([]);
  protected readonly communs = signal<ObjectifCommun[]>([]);
  protected readonly recues = computed(() => this.communs().filter((c) => c.statut === 'RECUE'));
  protected readonly actifs = computed(() => this.communs().filter((c) => c.statut === 'ACTIF'));
  protected readonly envoyees = computed(() => this.communs().filter((c) => c.statut === 'ENVOYEE'));
  protected readonly code = signal<string | null>(null);
  protected readonly copie = signal(false);
  protected readonly ajout = signal(false);
  /** Ami déplié (un seul à la fois). */
  protected readonly ouvert = signal<string | null>(null);
  /** Ami pour qui on confirme le retrait. */
  protected readonly aRetirer = signal<string | null>(null);
  protected formCode = new FormGroup({});
  protected modelCode: Partial<CodeAmi> = {};
  protected readonly champsCode = inject(SchemaFormService).champs('CodeAmi', {
    code: { props: { placeholder: 'ABC234', attributes: { autocapitalize: 'characters', autocomplete: 'off' } } },
  });

  ngOnInit(): void {
    this.charger();
    this.api.monCode().subscribe({ next: (c) => this.code.set(c), error: () => undefined });
  }

  private charger(): void {
    this.api.lister().subscribe({ next: (l) => this.amis.set(l), error: () => undefined });
    this.api.communs().subscribe({ next: (l) => this.communs.set(l), error: () => undefined });
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

  async partager(code: string): Promise<void> {
    const texte = `Ajoute-moi en ami sur Équinoxe avec mon code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: texte });
        return;
      }
      await navigator.clipboard.writeText(code);
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
    const code = this.modelCode.code?.trim().toUpperCase();
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

  accepter(c: ObjectifCommun): void {
    this.api.accepterCommun(c.id).subscribe((id) => {
      this.notifications.synchroniser();
      void this.router.navigate(['/objectifs', id]);
    });
  }

  quitterCommun(c: ObjectifCommun): void {
    this.api.quitterCommun(c.id).subscribe(() => this.communs.update((l) => l.filter((x) => x.id !== c.id)));
  }
}
