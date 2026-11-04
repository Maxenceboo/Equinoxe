import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Categorie, ObjectifSaisie } from '../../api/generated';
import { ObjectifsService } from '../../application/services';
import { NavigationService } from '../../core/navigation.service';
import { NotificationsService } from '../../core/notifications.service';

interface Idee {
  nom: string;
  categorie: Categorie;
  icone: string;
  heure: string;
}

const IDEES: Idee[] = [
  { nom: 'Sport', categorie: 'SPORT', icone: 'pi pi-bolt', heure: '18:00' },
  { nom: 'Me coucher tôt', categorie: 'SOMMEIL', icone: 'pi pi-moon', heure: '23:00' },
  { nom: 'Lire', categorie: 'AUTRE', icone: 'pi pi-book', heure: '21:00' },
  { nom: 'Marcher', categorie: 'SPORT', icone: 'pi pi-map', heure: '12:30' },
];

const FREQUENCES = [
  { libelle: 'Tous les jours', detail: '7 fois par semaine', cible: 7 },
  { libelle: '5 fois', detail: 'par semaine', cible: 5 },
  { libelle: '3 fois', detail: 'par semaine', cible: 3 },
  { libelle: '1 fois', detail: 'par semaine', cible: 1 },
];

const MOMENTS = [
  { libelle: 'Le matin', heure: '08:00' },
  { libelle: 'Le midi', heure: '12:30' },
  { libelle: 'Le soir', heure: '18:00' },
  { libelle: 'Avant de dormir', heure: '21:30' },
];

/**
 * Création d'un objectif en 3 questions, une par écran, avec de grosses cartes déjà remplies.
 * Le formulaire complet reste accessible par « Réglages avancés ».
 */
@Component({
  selector: 'app-assistant',
  imports: [FormsModule, Button],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="precedent()" />
      <div>
        <p class="etiquette">Question {{ etape() }} sur 3</p>
        <h1>{{ titres[etape() - 1] }}</h1>
      </div>
    </header>
    <div class="etapes-assistant" aria-hidden="true">
      @for (i of [1, 2, 3]; track i) {
        <span [class.faite]="i <= etape()"></span>
      }
    </div>

    @switch (etape()) {
      @case (1) {
        <div class="cartes-choix">
          @for (i of idees; track i.nom) {
            <button type="button" class="carte-choix grande" [class.choisi]="nom() === i.nom" (click)="choisirIdee(i)">
              <i [class]="i.icone"></i><strong>{{ i.nom }}</strong>
            </button>
          }
        </div>
        <label class="champ-libre">
          <span>Autre chose ?</span>
          <input type="text" maxlength="50" placeholder="Par exemple : boire 1,5 L d'eau" [ngModel]="autre()" (ngModelChange)="ecrireAutre($event)" />
        </label>
        <p-button label="Continuer" styleClass="w-full" [disabled]="!nom()" (onClick)="etape.set(2)" />
      }
      @case (2) {
        <div class="cartes-choix">
          @for (f of frequences; track f.cible) {
            <button type="button" class="carte-choix grande" [class.choisi]="cible() === f.cible" (click)="cible.set(f.cible); etape.set(3)">
              <strong>{{ f.libelle }}</strong><small>{{ f.detail }}</small>
            </button>
          }
        </div>
      }
      @case (3) {
        <div class="cartes-choix">
          @for (m of moments; track m.heure) {
            <button type="button" class="carte-choix grande" [class.choisi]="heure() === m.heure" (click)="heure.set(m.heure)">
              <strong>{{ m.libelle }}</strong><small>{{ m.heure.replace(':', ' h ') }}</small>
            </button>
          }
        </div>
        <label class="case-amis">
          <input type="checkbox" [ngModel]="visibleAmis()" (ngModelChange)="visibleAmis.set($event)" />
          <span>Visible par mes amis <small>(progression et flamme, jamais les détails)</small></span>
        </label>
        <p class="resume">{{ resume() }}</p>
        <p-button label="C'est parti" icon="pi pi-check" styleClass="w-full" [loading]="enCours()" (onClick)="creer()" />
      }
    }

    <p class="lien-avance"><a href="/objectifs/nouveau/avance" (click)="$event.preventDefault(); avance()">Réglages avancés</a></p>
  `,
})
export class AssistantPage {
  private readonly api = inject(ObjectifsService);
  private readonly notifications = inject(NotificationsService);
  private readonly navigation = inject(NavigationService);
  private readonly router = inject(Router);

  protected readonly idees = IDEES;
  protected readonly frequences = FREQUENCES;
  protected readonly moments = MOMENTS;
  protected readonly titres = ['Que veux-tu tenir ?', 'Combien de fois ?', 'Quand te le rappeler ?'];

  protected readonly etape = signal(1);
  protected readonly nom = signal('');
  protected readonly autre = signal('');
  protected readonly categorie = signal<Categorie>('AUTRE');
  protected readonly cible = signal(3);
  protected readonly heure = signal('18:00');
  protected readonly visibleAmis = signal(false);
  protected readonly enCours = signal(false);

  protected readonly resume = computed(() => {
    const frequence = this.cible() === 7 ? 'tous les jours' : `${this.cible()} fois par semaine`;
    const rappel = this.categorie() === 'SOMMEIL' ? 'coucher visé à' : 'rappel à';
    return `${this.nom()}, ${frequence}, ${rappel} ${this.heure().replace(':', ' h ')}.`;
  });

  choisirIdee(i: Idee): void {
    this.nom.set(i.nom);
    this.autre.set('');
    this.categorie.set(i.categorie);
    this.heure.set(i.heure);
    this.etape.set(2);
  }

  ecrireAutre(texte: string): void {
    this.autre.set(texte);
    this.nom.set(texte.trim());
    this.categorie.set('AUTRE');
  }

  precedent(): void {
    if (this.etape() > 1) this.etape.update((e) => e - 1);
    else this.navigation.retour();
  }

  private saisie(): ObjectifSaisie {
    const quotidien = this.cible() === 7;
    return {
      nom: this.nom().slice(0, 50),
      categorie: this.categorie(),
      typeFrequence: quotidien ? 'QUOTIDIEN' : 'PAR_SEMAINE',
      cible: this.cible(),
      heure: this.heure(),
      visibleAmis: this.visibleAmis(),
    };
  }

  /** Ouvre le formulaire complet en gardant ce qui a déjà été saisi. */
  avance(): void {
    void this.router.navigate(['/objectifs/nouveau/avance'], { state: { saisie: this.saisie() } });
  }

  creer(): void {
    const saisie = this.saisie();
    this.enCours.set(true);
    this.api.creerObjectif(saisie).subscribe({
      next: () => {
        this.notifications.synchroniser();
        void this.router.navigate(['/'], { replaceUrl: true });
      },
      error: () => this.enCours.set(false),
    });
  }
}
