import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyAttributes } from '@ngx-formly/core';
import { InputText } from 'primeng/inputtext';
import { Horloge } from './horloge';

/**
 * Champ de quantité : un simple nombre, ou une durée choisie sur l'horloge quand props.duree est vrai
 * (objectifs en temps, durée d'une séance).
 */
@Component({
  selector: 'app-champ-quantite',
  imports: [ReactiveFormsModule, FormlyAttributes, InputText, Horloge],
  template: `
    @if (props['duree']) {
      <app-horloge [valeur]="formControl.value ?? 0" [max]="props['dureeMax'] ?? 1435" (changement)="choisir($event)" />
    } @else {
      <input pInputText type="number" inputmode="numeric" min="0" [formControl]="formControl" [formlyAttributes]="field" />
    }
  `,
})
export class ChampQuantite extends FieldType<FieldTypeConfig> {
  protected choisir(minutes: number): void {
    this.formControl.setValue(minutes === 0 ? null : minutes);
    this.formControl.markAsDirty();
  }
}
