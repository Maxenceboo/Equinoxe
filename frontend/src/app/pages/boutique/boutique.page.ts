import { Component, OnInit, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Objectif, Profil } from '../../api/generated';
import { BoutiqueService, ObjectifsService, ProfilService } from '../../application/services';
import { CelebrationService } from '../../core/celebration.service';
import { NavigationService } from '../../core/navigation.service';
import { ReglagesService } from '../../core/reglages.service';
import { COUT_JOKER, PALETTES, Palette } from '../../domaine/boutique';

/** Boutique : dépenser ses points en jokers et en couleurs pour les animations. */
@Component({
  selector: 'app-boutique',
  imports: [Button, Dialog],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Boutique</h1></div>
    </header>

    @if (profil(); as p) {
      <section class="solde" aria-label="Points à dépenser">
        <strong>{{ p.solde }}</strong>
        <span>points à dépenser</span>
      </section>

      <button type="button" class="carte-joker" [disabled]="p.solde < coutJoker" (click)="choixJoker.set(true)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
        <span class="texte">
          <strong>Joker</strong>
          <small>Un raté de plus qui ne casse pas ta série, ce mois-ci</small>
        </span>
        <span class="prix">{{ coutJoker }}</span>
      </button>

      <h2 class="titre-section">Couleurs</h2>
      <p class="aide">Elles apparaissent quand tu coches et quand tu fêtes une réussite.</p>
      <ul class="liste-palettes">
        @for (pal of palettes; track pal.code) {
          <li>
            <button type="button" class="ligne-palette" [class.choisie]="reglages.palette() === pal.code"
                    [disabled]="!p.palettes.includes(pal.code) && p.solde < pal.cout" (click)="palette(pal, p)">
              <span class="disque" aria-hidden="true"
                    [style.background]="'conic-gradient(' + pal.couleurs[0] + ', ' + pal.couleurs[1] + ', ' + pal.couleurs[2] + ', ' + pal.couleurs[0] + ')'"></span>
              <strong>{{ pal.nom }}</strong>
              @if (reglages.palette() === pal.code) {
                <span class="etat"><i class="pi pi-check"></i> Active</span>
              } @else if (p.palettes.includes(pal.code)) {
                <span class="etat">Choisir</span>
              } @else {
                <span class="prix">{{ pal.cout }}</span>
              }
            </button>
          </li>
        }
      </ul>
    }

    <p-dialog header="Pour quel objectif ?" [visible]="choixJoker()" (visibleChange)="!$event && choixJoker.set(false)" [modal]="true" [dismissableMask]="true" [style]="{ width: '22rem' }">
      <ul class="reglages">
        @for (o of objectifs(); track o.id) {
          <li><button type="button" class="reglage" (click)="acheterJoker(o)"><span>{{ o.nom }}</span><i class="pi pi-chevron-right"></i></button></li>
        } @empty {
          <li class="aide">Crée d'abord un objectif.</li>
        }
      </ul>
    </p-dialog>
  `,
})
export class BoutiquePage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  protected readonly reglages = inject(ReglagesService);
  private readonly profils = inject(ProfilService);
  private readonly boutique = inject(BoutiqueService);
  private readonly objectifsApi = inject(ObjectifsService);
  private readonly celebration = inject(CelebrationService);
  private readonly messages = inject(MessageService);

  protected readonly profil = signal<Profil | null>(inject(ProfilService).dernier());
  protected readonly objectifs = signal<Objectif[]>([]);
  protected readonly choixJoker = signal(false);
  protected readonly coutJoker = COUT_JOKER;
  protected readonly palettes = PALETTES;

  ngOnInit(): void {
    this.charger();
    this.objectifsApi.listerObjectifs(false).subscribe((l) => this.objectifs.set(l));
  }

  private charger(): void {
    this.profils.profil().subscribe((p) => this.profil.set(p));
  }

  acheterJoker(o: Objectif): void {
    const p = this.profil();
    if (!p) return;
    this.boutique.acheterJoker(o.id, p.solde).subscribe(() => {
      this.choixJoker.set(false);
      this.messages.add({ severity: 'success', summary: 'Joker ajouté', detail: `« ${o.nom} » est protégé une fois de plus ce mois-ci.` });
      this.charger();
    });
  }

  /** Une palette possédée se choisit ; sinon on l'achète. Dans les deux cas, on la montre tout de suite. */
  palette(pal: Palette, p: Profil): void {
    const montrer = () => {
      this.reglages.choisirPalette(pal.code);
      this.celebration.celebrer({ titre: pal.nom, sousTitre: 'Tes animations auront ces couleurs.', nombre: '✓', legende: 'couleurs choisies' });
    };
    if (p.palettes.includes(pal.code)) {
      montrer();
      return;
    }
    this.boutique.acheterPalette(pal.code, p.solde).subscribe(() => {
      montrer();
      this.charger();
    });
  }
}
