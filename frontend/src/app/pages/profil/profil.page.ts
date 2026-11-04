import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Profil } from '../../api/generated';
import { ProfilService } from '../../application/services';
import { phaseDuNiveau } from '../../core/celebration.service';
import { niveau } from '../../domaine/recompenses';
import { cheminPhase } from '../../shared/lune-overlay';

/** Profil : ta lune (ton niveau), puis trois entrées : badges, boutique, réglages. */
@Component({
  selector: 'app-profil',
  imports: [RouterLink],
  template: `
    <header class="entete">
      <div>
        <h1>{{ profil()?.prenom ?? 'Profil' }}</h1>
      </div>
    </header>

    @if (profil(); as p) {
      <!-- Ta lune : sa phase montre ton niveau -->
      <section class="ma-lune" aria-label="Ton niveau">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="80" class="contour" />
          <path [attr.d]="lune()" class="eclairee" />
        </svg>
        <div>
          <strong>{{ p.nomNiveau }}</strong>
          <span>{{ p.points }} points gagnés</span>
        </div>
      </section>
      <div class="jauge" role="progressbar" [attr.aria-valuenow]="p.points" [attr.aria-valuemin]="p.pointsNiveau" [attr.aria-valuemax]="p.pointsNiveauSuivant">
        <span [style.width.%]="avancement()"></span>
      </div>
      <p class="prochaine-phase">Encore {{ p.pointsNiveauSuivant - p.points }} points pour {{ niveauSuivant() }}</p>

      <ul class="menu-profil">
        <li><a routerLink="/profil/badges"><span>Badges</span><em>{{ obtenus() }} sur {{ p.badges.length }}</em><i class="pi pi-chevron-right"></i></a></li>
        <li><a routerLink="/profil/boutique"><span>Boutique</span><em>{{ p.solde }} pts</em><i class="pi pi-chevron-right"></i></a></li>
        <li><a routerLink="/profil/reglages"><span>Réglages</span><i class="pi pi-chevron-right"></i></a></li>
      </ul>
    }
  `,
})
export class ProfilPage implements OnInit {
  private readonly api = inject(ProfilService);
  protected readonly profil = signal<Profil | null>(this.api.dernier());
  /** Dessin de ta lune à la phase de ton niveau. */
  protected readonly lune = computed(() => cheminPhase(phaseDuNiveau(this.profil()?.niveau ?? 1)));
  protected readonly niveauSuivant = computed(() => {
    const p = this.profil();
    return p ? niveau(p.pointsNiveauSuivant).nom : '';
  });
  protected readonly obtenus = computed(() => this.profil()?.badges.filter((b) => b.obtenu).length ?? 0);
  protected readonly avancement = computed(() => {
    const p = this.profil();
    if (!p) return 0;
    return Math.min(100, Math.round(((p.points - p.pointsNiveau) / (p.pointsNiveauSuivant - p.pointsNiveau)) * 100));
  });

  ngOnInit(): void {
    this.api.profil().subscribe((p) => this.profil.set(p));
  }
}
