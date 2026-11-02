import { Routes } from '@angular/router';
import { connecteGuard } from './core/connecte.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () => import('./pages/connexion/connexion.page').then((m) => m.ConnexionPage),
  },
  {
    path: '',
    canActivate: [connecteGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/accueil/accueil.page').then((m) => m.AccueilPage) },
      { path: 'bilan', loadComponent: () => import('./pages/bilan/bilan.page').then((m) => m.BilanPage) },
      {
        path: 'archives',
        loadComponent: () => import('./pages/archives/archives.page').then((m) => m.ArchivesPage),
      },
      {
        path: 'objectifs/nouveau',
        loadComponent: () => import('./pages/objectif-form/objectif-form.page').then((m) => m.ObjectifFormPage),
      },
      {
        path: 'objectifs/:id/modifier',
        loadComponent: () => import('./pages/objectif-form/objectif-form.page').then((m) => m.ObjectifFormPage),
      },
      {
        path: 'objectifs/:id',
        loadComponent: () => import('./pages/objectif-detail/objectif-detail.page').then((m) => m.ObjectifDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
