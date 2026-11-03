import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationService } from '../../core/navigation.service';
import { Button } from 'primeng/button';
import { Objectif } from '../../api/generated';
import { ObjectifsService } from '../../application/services';
import { NotificationsService } from '../../core/notifications.service';

@Component({
  selector: 'app-archives',
  imports: [Button],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <h1>Archives</h1>
    </header>

    @if (charge() && archives().length === 0) {
      <p class="aide">Aucun objectif archivé.</p>
    }

    <ul class="objectifs">
      @for (o of archives(); track o.id) {
        <li class="objectif archive">
          <div class="infos">
            <span class="nom">{{ o.nom }}</span>
            <small>Record : {{ o.progression.meilleureSerie }} {{ o.progression.uniteSerie === 'JOURS' ? 'jour(s)' : 'semaine(s)' }}</small>
          </div>
          <p-button label="Restaurer" [outlined]="true" size="small" (onClick)="restaurer(o)" />
        </li>
      }
    </ul>
  `,
})
export class ArchivesPage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  private readonly api = inject(ObjectifsService);
  private readonly notifications = inject(NotificationsService);
  protected readonly archives = signal<Objectif[]>([]);
  protected readonly charge = signal(false);

  ngOnInit(): void {
    this.api.listerObjectifs(true).subscribe((l) => {
      this.archives.set(l);
      this.charge.set(true);
    });
  }

  restaurer(o: Objectif): void {
    this.api.restaurerObjectif(o.id).subscribe(() => {
      this.archives.update((l) => l.filter((x) => x.id !== o.id));
      this.notifications.synchroniser();
    });
  }
}
