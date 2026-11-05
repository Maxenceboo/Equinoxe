import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { CodeAmi, Profil } from '../../api/generated';
import { SchemaFormService } from '../../core/schema-form.service';
import { AmisService, ProfilService } from '../../application/services';
import { Button } from 'primeng/button';
import { lienAmi } from '../../core/invitation.service';
import { phaseDuNiveau } from '../../core/celebration.service';
import { niveau } from '../../domaine/recompenses';
import { cheminPhase } from '../../shared/lune-overlay';
import { BadgeIcone } from '../../shared/badge-icone';

/** Profil : ton identifiant et l'ajout d'amis, ta lune (ton niveau), puis badges, boutique, réglages. */
@Component({
  selector: 'app-profil',
  imports: [RouterLink, BadgeIcone, Button, Dialog, FormlyForm, ReactiveFormsModule],
  template: `
    <header class="entete">
      <div>
        <h1>{{ profil()?.prenom ?? 'Profil' }}</h1>
        @if (amis.pseudo(); as ps) {
          <a class="mon-identifiant" routerLink="/identifiant" aria-label="Changer mon identifiant">&#64;{{ ps }} <i class="pi pi-pencil"></i></a>
        }
      </div>
    </header>

    <div class="actions-amis">
      <p-button label="Ajouter un ami" icon="pi pi-user-plus" [outlined]="true" size="small" (onClick)="ouvrirAjout()" />
      @if (amis.pseudo(); as ps) {
        <p-button [label]="copie() ? 'Lien copié' : 'Partager mon lien'" icon="pi pi-share-alt" [outlined]="true" size="small" (onClick)="partager(ps)" />
      }
    </div>

    <p-dialog
      header="Ajouter un ami"
      [visible]="ajout()"
      (visibleChange)="!$event && ajout.set(false)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Tape son identifiant, affiché sur son Profil. Ou envoie-lui ton lien avec « Partager mon lien ».</p>
      <form [formGroup]="formCode" (ngSubmit)="envoyer()">
        <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="ajout.set(false)" />
          <p-button type="submit" label="Ajouter" [loading]="enCours()" />
        </div>
      </form>
    </p-dialog>

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

      <!-- Les badges en vitrine : ceux gagnés brillent, les autres attendent -->
      <a class="vitrine-badges" routerLink="/profil/badges">
        <div class="vitrine-titre"><strong>Badges</strong><span>{{ obtenus() }} sur {{ p.badges.length }} <i class="pi pi-chevron-right"></i></span></div>
        <ul>
          @for (b of p.badges; track b.code) {
            <li [class.obtenu]="b.obtenu"><app-badge-icone [code]="b.code" [obtenu]="b.obtenu" /></li>
          }
        </ul>
        @if (prochainBadge(); as b) {
          <small>Prochain : {{ b.nom }}, {{ b.description.charAt(0).toLowerCase() + b.description.slice(1) }}</small>
        }
      </a>

      <ul class="menu-profil">
        <li><a routerLink="/profil/boutique"><span>Boutique</span><em>{{ p.solde }} pts</em><i class="pi pi-chevron-right"></i></a></li>
        <li><a routerLink="/profil/reglages"><span>Réglages</span><i class="pi pi-chevron-right"></i></a></li>
      </ul>
    }
  `,
})
export class ProfilPage implements OnInit {
  private readonly api = inject(ProfilService);
  protected readonly amis = inject(AmisService);
  protected readonly copie = signal(false);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  /** ?ajouter=1 (depuis Proches quand on n'a pas encore d'ami) : la fenêtre d'ajout s'ouvre directement. */
  readonly ajouter = input<string>();
  protected readonly ajout = signal(false);
  protected readonly enCours = signal(false);
  protected formCode = new FormGroup({});
  protected modelCode: Partial<CodeAmi> = {};
  protected readonly champsCode = inject(SchemaFormService).champs('CodeAmi', {
    code: { props: { placeholder: '@lea', attributes: { autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false' } } },
  });
  protected readonly profil = signal<Profil | null>(this.api.dernier());
  /** Dessin de ta lune à la phase de ton niveau. */
  protected readonly lune = computed(() => cheminPhase(phaseDuNiveau(this.profil()?.niveau ?? 1)));
  protected readonly niveauSuivant = computed(() => {
    const p = this.profil();
    return p ? niveau(p.pointsNiveauSuivant).nom : '';
  });
  protected readonly obtenus = computed(() => this.profil()?.badges.filter((b) => b.obtenu).length ?? 0);
  protected readonly prochainBadge = computed(() => this.profil()?.badges.find((b) => !b.obtenu) ?? null);
  protected readonly avancement = computed(() => {
    const p = this.profil();
    if (!p) return 0;
    return Math.min(100, Math.round(((p.points - p.pointsNiveau) / (p.pointsNiveauSuivant - p.pointsNiveau)) * 100));
  });

  ngOnInit(): void {
    this.api.profil().subscribe((p) => this.profil.set(p));
    if (this.amis.pseudo() === undefined) this.amis.chargerPseudo().subscribe({ error: () => undefined });
    if (this.ajouter()) this.ouvrirAjout();
  }

  ouvrirAjout(): void {
    this.formCode = new FormGroup({});
    this.modelCode = {};
    this.ajout.set(true);
  }

  envoyer(): void {
    this.formCode.markAllAsTouched();
    const code = this.modelCode.code?.trim();
    if (this.formCode.invalid || !code) return;
    this.enCours.set(true);
    this.amis.ajouter(code).subscribe({
      next: (nom) => {
        this.enCours.set(false);
        this.ajout.set(false);
        this.messages.add({ severity: 'success', summary: `${nom} est ton ami`, detail: 'Retrouve ses objectifs dans Proches.' });
        void this.router.navigate(['/foyer']);
      },
      error: () => this.enCours.set(false),
    });
  }

  /** Lien pour se faire ajouter en ami (ouvre l'app sur Android). */
  async partager(pseudo: string): Promise<void> {
    const lien = lienAmi(pseudo);
    try {
      if (navigator.share) {
        await navigator.share({ text: `Ajoute-moi en ami sur Équinoxe : ${lien} (mon identifiant : @${pseudo})` });
        return;
      }
      await navigator.clipboard.writeText(lien);
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2000);
    } catch {
      /* partage annulé */
    }
  }
}
