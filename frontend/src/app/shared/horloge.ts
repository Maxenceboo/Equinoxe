import { Component, computed, input, output } from '@angular/core';

/**
 * Choix d'une durée façon minuteur : heures et minutes, chacune avec ses flèches.
 * Les minutes avancent de 5 en 5 ; la valeur rendue est en minutes.
 */
@Component({
  selector: 'app-horloge',
  template: `
    <div class="horloge" role="group" [attr.aria-label]="'Durée : ' + heures() + ' h ' + minutes() + ' min'">
      <div class="roue">
        <button type="button" aria-label="Une heure de plus" (click)="changer(60)"><i class="pi pi-chevron-up"></i></button>
        <strong>{{ heures() }}</strong>
        <button type="button" aria-label="Une heure de moins" [disabled]="valeur() < 60" (click)="changer(-60)"><i class="pi pi-chevron-down"></i></button>
        <small>h</small>
      </div>
      <span class="deux-points">:</span>
      <div class="roue">
        <button type="button" aria-label="5 minutes de plus" (click)="changer(5)"><i class="pi pi-chevron-up"></i></button>
        <strong>{{ minutes() < 10 ? '0' + minutes() : minutes() }}</strong>
        <button type="button" aria-label="5 minutes de moins" [disabled]="valeur() < 5" (click)="changer(-5)"><i class="pi pi-chevron-down"></i></button>
        <small>min</small>
      </div>
    </div>
  `,
})
export class Horloge {
  readonly valeur = input(0);
  /** Durée maximale, en minutes. */
  readonly max = input(24 * 60 - 5);
  readonly changement = output<number>();
  protected readonly heures = computed(() => Math.floor(this.valeur() / 60));
  protected readonly minutes = computed(() => this.valeur() % 60);

  protected changer(delta: number): void {
    // on retombe sur un multiple de 5 (une valeur saisie avant pouvait être 47 min)
    const base = delta % 60 === 0 ? this.valeur() : Math.round(this.valeur() / 5) * 5;
    this.changement.emit(Math.max(0, Math.min(this.max(), base + delta)));
  }
}
