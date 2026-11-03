import { Component, OnInit, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { CodeBinome, ObjectifSuivi } from '../../api/generated';
import { BinomesService } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';
import { Flamme } from '../../shared/flamme';

/** Les amis hors famille : les objectifs qu'on suit grâce à un code partagé. */
@Component({
  selector: 'app-amis',
  imports: [ReactiveFormsModule, FormlyForm, Button, Dialog, Flamme],
  template: `
    <section class="binomes" aria-label="Amis">
      <h2 class="titre-section">Amis</h2>
      @for (b of binomes(); track b.objectifId) {
        <div class="binome" (click)="ouvert.set(ouvert() === b.objectifId ? null : b.objectifId)">
          <div class="ligne-haut">
            <span class="nom">{{ b.nom }} <small>· {{ b.ami }}</small></span>
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
          @if (ouvert() === b.objectifId) {
            <button type="button" class="lien-details quitter" (click)="quitter(b); $event.stopPropagation()">Ne plus suivre {{ b.ami }}</button>
          }
        </div>
      } @empty {
        <p class="aide">Un ami hors de la famille ? Partage un objectif depuis sa page, ou entre le code qu'il t'a donné : vous verrez vos flammes.</p>
      }
      <p-button label="Suivre un ami avec un code" icon="pi pi-user-plus" [outlined]="true" (onClick)="ouvrir()" />
    </section>

    <p-dialog
      header="Suivre un ami"
      [visible]="rejoindre()"
      (visibleChange)="!$event && rejoindre.set(false)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Demande à ton ami le code affiché sur la page de son objectif. Tu verras sa progression et sa flamme, lui verra que tu le suis.</p>
      <form [formGroup]="formCode" (ngSubmit)="envoyer()">
        <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="rejoindre.set(false)" />
          <p-button type="submit" label="Suivre" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class Amis implements OnInit {
  private readonly api = inject(BinomesService);
  protected readonly binomes = signal<ObjectifSuivi[]>([]);
  protected readonly rejoindre = signal(false);
  /** Ami dont on montre l'action « Ne plus suivre » (cachée par défaut pour éviter un tap malheureux). */
  protected readonly ouvert = signal<number | null>(null);
  protected formCode = new FormGroup({});
  protected modelCode: Partial<CodeBinome> = {};
  protected readonly champsCode = inject(SchemaFormService).champs('CodeBinome', {
    code: { props: { placeholder: 'ABC234', attributes: { autocapitalize: 'characters', autocomplete: 'off' } } },
  });

  ngOnInit(): void {
    this.api.listerBinomes().subscribe({ next: (l) => this.binomes.set(l), error: () => undefined });
  }

  protected segments(b: ObjectifSuivi): boolean[] {
    return Array.from({ length: b.progression.cible }, (_, i) => i < b.progression.realisees);
  }

  protected etat(b: ObjectifSuivi): string {
    if (b.progression.faitAujourdhui) return "Fait aujourd'hui";
    return b.progression.atteint ? 'Semaine réussie' : "Pas encore aujourd'hui";
  }

  ouvrir(): void {
    this.formCode = new FormGroup({});
    this.modelCode = {};
    this.rejoindre.set(true);
  }

  envoyer(): void {
    this.formCode.markAllAsTouched();
    const code = this.modelCode.code?.trim().toUpperCase();
    if (this.formCode.invalid || !code) return;
    this.api.rejoindreBinome({ code }).subscribe((b) => {
      this.binomes.update((l) => (l.some((x) => x.objectifId === b.objectifId) ? l : [...l, b]));
      this.rejoindre.set(false);
    });
  }

  quitter(b: ObjectifSuivi): void {
    this.api.quitterBinome(b.objectifId).subscribe(() =>
      this.binomes.update((l) => l.filter((x) => x.objectifId !== b.objectifId)),
    );
  }
}
