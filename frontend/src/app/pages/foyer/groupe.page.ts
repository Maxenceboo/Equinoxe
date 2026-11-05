import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Foyer, MembreFoyer, ReglagesFoyer, TypeEncouragement } from '../../api/generated';
import { FoyerService } from '../../application/services';
import { NavigationService } from '../../core/navigation.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { PhotosService } from '../../core/photos.service';
import { Avatar } from '../../shared/avatar';

/** Un groupe : la jauge commune de la semaine, la récompense, les membres et le bouton Encourager. */
@Component({
  selector: 'app-groupe',
  imports: [ReactiveFormsModule, FormlyForm, Button, Avatar],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div>
        <h1>{{ foyer()?.nom }}</h1>
        @if (foyer(); as f) {
          <small>{{ f.membres.length }} membre{{ f.membres.length > 1 ? 's' : '' }} · on avance ensemble</small>
        }
      </div>
    </header>

    @if (foyer(); as f) {
      <section class="foyer-jauge" aria-label="Objectif commun de la semaine">
        <p class="etiquette">Cette semaine, ensemble</p>
        <div class="foyer-chiffres">
          <strong>{{ f.cochesSemaine }}</strong><span>/{{ f.objectifSemaine }} coches</span>
        </div>
        <div class="jauge grande" role="progressbar" [attr.aria-valuenow]="f.cochesSemaine" aria-valuemin="0" [attr.aria-valuemax]="f.objectifSemaine">
          <span [style.width.%]="avancement()"></span>
        </div>
        @if (f.recompense) {
          <p class="recompense">
            <i class="pi pi-gift"></i>
            @if (f.cochesSemaine >= f.objectifSemaine) {
              Gagné : {{ f.recompense }} !
            } @else {
              À la clé : {{ f.recompense }}
            }
          </p>
        } @else if (f.parent) {
          <p class="aide">Choisis une récompense pour le groupe dans les réglages ci-dessous.</p>
        }
      </section>

      <h2 class="titre-section">Membres</h2>
      <ul class="membres">
        @for (m of f.membres; track m.id) {
          <li class="membre">
            <app-avatar [id]="m.id" [nom]="m.prenom" [taille]="2.5" />
            <div class="membre-infos">
              <span class="nom">{{ m.prenom }}{{ m.moi ? ' (toi)' : '' }}</span>
              <small>{{ m.parent ? 'Parent · ' : '' }}{{ resume(m) }}</small>
            </div>
            @if (!m.moi) {
              <button type="button" class="puce encourager" [class.envoye]="envoyes().has(m.id)" [disabled]="envoyes().has(m.id)" (click)="encourager(f, m)">
                <i class="pi" [class.pi-heart]="!envoyes().has(m.id)" [class.pi-check]="envoyes().has(m.id)"></i>
                {{ envoyes().has(m.id) ? 'Envoyé' : 'Encourager' }}
              </button>
            }
          </li>
        }
      </ul>

      <div class="encart">
        <p><strong>Inviter quelqu'un</strong></p>
        <p class="aide">À entrer dans Proches, puis « Mes groupes ».</p>
        <p class="code-foyer" aria-label="Code du groupe">{{ f.code.slice(0, 3) }} {{ f.code.slice(3) }}</p>
        <p-button label="Partager le code" icon="pi pi-share-alt" [outlined]="true" (onClick)="partager(f)" />
      </div>

      @if (f.parent) {
        <h2 class="titre-section">Réglages du groupe</h2>
        <form [formGroup]="formReglages" (ngSubmit)="regler(f)">
          <formly-form [form]="formReglages" [fields]="champsReglages" [model]="modelReglages" />
          <p-button type="submit" label="Enregistrer" [outlined]="true" [loading]="enCours()" />
        </form>

        @if (nonParents(f).length > 0) {
          <p class="sous-etiquette">Nommer un autre parent</p>
          <p class="aide">Un parent peut changer la récompense et l'objectif du groupe.</p>
          <ul class="reglages">
            @for (m of nonParents(f); track m.id) {
              <li><button type="button" class="reglage" (click)="nommerParent(f, m)"><span>{{ m.prenom }}</span><small>Nommer parent</small></button></li>
            }
          </ul>
        }
      }

      <p-button class="quitter-foyer" label="Quitter ce groupe" [text]="true" severity="secondary" (onClick)="quitter(f)" />
    } @else if (charge()) {
      <p class="aide">Ce groupe n'existe plus, ou tu n'en fais plus partie.</p>
    }
  `,
})
export class GroupePage implements OnInit {
  readonly id = input.required<string>();
  protected readonly navigation = inject(NavigationService);
  private readonly api = inject(FoyerService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly foyer = signal<Foyer | null>(null);
  protected readonly charge = signal(false);
  protected readonly enCours = signal(false);
  protected readonly envoyes = signal(new Set<string>());
  protected readonly avancement = computed(() => {
    const f = this.foyer();
    return f ? Math.min(100, Math.round((f.cochesSemaine / f.objectifSemaine) * 100)) : 0;
  });

  protected readonly formReglages = new FormGroup({});
  protected modelReglages: Partial<ReglagesFoyer> = {};
  protected readonly champsReglages = inject(SchemaFormService).champs('ReglagesFoyer', {
    objectifSemaine: { props: { type: 'number', attributes: { inputmode: 'numeric' } } },
  });

  private readonly photos = inject(PhotosService);

  ngOnInit(): void {
    void this.photos.charger(true);
    this.charger();
  }

  private charger(): void {
    this.api.foyer(Number(this.id())).subscribe({
      next: (f) => {
        this.foyer.set(f);
        if (f) this.modelReglages = { recompense: f.recompense, objectifSemaine: f.objectifSemaine };
        this.charge.set(true);
      },
      error: () => this.charge.set(true),
    });
  }

  protected nonParents(f: Foyer): MembreFoyer[] {
    return f.membres.filter((m) => !m.parent && !m.moi);
  }

  protected resume(m: MembreFoyer): string {
    if (m.objectifs === 0) return "Pas encore d'objectif";
    return `${m.coches} coche${m.coches > 1 ? 's' : ''} · ${m.tenus}/${m.objectifs} tenu${m.tenus > 1 ? 's' : ''}`;
  }

  regler(f: Foyer): void {
    this.formReglages.markAllAsTouched();
    if (this.formReglages.invalid) return;
    this.enCours.set(true);
    this.api.regler(f.id, this.modelReglages as ReglagesFoyer).subscribe({
      next: () => {
        this.enCours.set(false);
        this.messages.add({ severity: 'success', summary: 'Enregistré', detail: 'Le groupe voit la nouvelle récompense.' });
        this.charger();
      },
      error: () => this.enCours.set(false),
    });
  }

  /** Un seul bouton : « Bravo » si la personne a déjà tenu un objectif cette semaine, « Courage » sinon. */
  encourager(f: Foyer, m: MembreFoyer): void {
    const type: TypeEncouragement = m.tenus > 0 ? 'BRAVO' : 'COURAGE';
    this.api.encourager(f.id, m.id, type).subscribe(() => {
      this.envoyes.update((e) => new Set(e).add(m.id));
      this.messages.add({ severity: 'success', summary: 'Envoyé', detail: `${m.prenom} le verra en ouvrant l'app.` });
    });
  }

  nommerParent(f: Foyer, m: MembreFoyer): void {
    this.api.nommerParent(f.id, m.id).subscribe(() => {
      this.messages.add({ severity: 'success', summary: 'C\'est fait', detail: `${m.prenom} peut maintenant régler la récompense.` });
      this.charger();
    });
  }

  async partager(f: Foyer): Promise<void> {
    const texte = `Rejoins notre groupe « ${f.nom} » sur Équinoxe : https://equinoxe-app.fr/invite/?groupe=${f.code} (ou avec le code ${f.code})`;
    try {
      if (navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        this.messages.add({ severity: 'success', summary: 'Copié', detail: 'Colle le message à tes proches.' });
      }
    } catch {
      /* partage annulé */
    }
  }

  quitter(f: Foyer): void {
    this.api.quitter(f.id).subscribe(() => this.router.navigate(['/foyer/groupes'], { replaceUrl: true }));
  }
}
