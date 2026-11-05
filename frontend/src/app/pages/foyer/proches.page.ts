import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoiteService } from '../../core/boite.service';
import { Cloche } from '../../shared/cloche';
import { Amis } from './amis';

/** L'onglet Proches : les amis et les objectifs faits à deux. Les groupes sont sur une page à part. */
@Component({
  selector: 'app-proches',
  imports: [RouterLink, Amis, Cloche],
  template: `
    <header class="entete">
      <div><h1>Proches</h1></div>
      <app-cloche />
    </header>

    <app-amis />

    <a class="lien-groupes" routerLink="/foyer/groupes">Mes groupes <i class="pi pi-chevron-right"></i></a>
  `,
})
export class ProchesPage implements OnInit {
  private readonly boite = inject(BoiteService);

  ngOnInit(): void {
    this.boite.charger();
  }
}
