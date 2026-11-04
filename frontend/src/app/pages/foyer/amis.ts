import { Component, OnInit, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Ami, CodeAmi, ObjectifSuivi } from '../../api/generated';
import { AmisService } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';
import { Flamme } from '../../shared/flamme';

/** Les amis hors groupe : on s'ajoute avec un code perso et on voit les objectifs visibles de l'autre. */
@Component({
  selector: 'app-amis',
  imports: [ReactiveFormsModule, FormlyForm, Button, Dialog, Flamme],
  template: `
    <section class="binomes" aria-label="Amis">
      <h2 class="titre-section">Amis</h2>
      @for (a of amis(); track a.id) {
        <div class="ami">
          <button type="button" class="nom-ami" (click)="ouvert.set(ouvert() === a.id ? null : a.id)">
            {{ a.nom }} <i class="pi" [class.pi-chevron-down]="ouvert() !== a.id" [class.pi-chevron-up]="ouvert() === a.id"></i>
          </button>
          @if (ouvert() === a.id) {
            <button type="button" class="lien-details quitter" (click)="retirer(a)">Retirer {{ a.nom }} de mes amis</button>
          }
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
            <small class="aide">{{ a.nom }} n'a pas encore d'objectif visible par ses amis.</small>
          }
        </div>
      } @empty {
        <p class="aide">Ajoute des amis avec leur code : tu verras leurs objectifs visibles, et eux les tiens. Tes objectifs privés restent privés.</p>
      }

      <div class="partage mon-code">
        <p class="etiquette">Mon code ami</p>
        @if (code(); as c) {
          <div class="code">
            <strong>{{ c }}</strong>
            <p-button [label]="copie() ? 'Copié' : 'Partager'" icon="pi pi-share-alt" [outlined]="true" (onClick)="partager(c)" />
          </div>
        }
        <small class="aide">Pour qu'un objectif soit vu par tes amis, active « Visible par mes amis » sur sa page.</small>
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
  protected readonly amis = signal<Ami[]>([]);
  protected readonly code = signal<string | null>(null);
  protected readonly copie = signal(false);
  protected readonly ajout = signal(false);
  /** Ami dont on montre l'action « Retirer » (cachée par défaut pour éviter un tap malheureux). */
  protected readonly ouvert = signal<string | null>(null);
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
  }

  protected segments(b: ObjectifSuivi): boolean[] {
    return Array.from({ length: b.progression.cible }, (_, i) => i < b.progression.realisees);
  }

  protected etat(b: ObjectifSuivi): string {
    if (b.progression.faitAujourdhui) return "Fait aujourd'hui";
    return b.progression.atteint ? 'Semaine réussie' : "Pas encore aujourd'hui";
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
      this.amis.update((l) => l.filter((x) => x.id !== a.id));
    });
  }
}
