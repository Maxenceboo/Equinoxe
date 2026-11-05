import { Routes } from '@angular/router';
import { connecteGuard } from './core/connecte.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    loadComponent: () => import('./pages/connexion/connexion.page').then((m) => m.ConnexionPage),
  },
  {
    path: 'invite',
    loadComponent: () => import('./pages/invite/invite.page').then((m) => m.InvitePage),
  },
  {
    path: '',
    canActivate: [connecteGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/accueil/accueil.page').then((m) => m.AccueilPage) },
      { path: 'bilan', loadComponent: () => import('./pages/bilan/bilan.page').then((m) => m.BilanPage) },
      { path: 'foyer', loadComponent: () => import('./pages/foyer/proches.page').then((m) => m.ProchesPage) },
      { path: 'foyer/groupes', loadComponent: () => import('./pages/foyer/foyer.page').then((m) => m.FoyerPage) },
      { path: 'foyer/:id', loadComponent: () => import('./pages/foyer/groupe.page').then((m) => m.GroupePage) },
      { path: 'profil', loadComponent: () => import('./pages/profil/profil.page').then((m) => m.ProfilPage) },
      {
        path: 'profil/archives',
        loadComponent: () => import('./pages/archives/archives.page').then((m) => m.ArchivesPage),
      },
      { path: 'profil/boutique', loadComponent: () => import('./pages/boutique/boutique.page').then((m) => m.BoutiquePage) },
      { path: 'profil/badges', loadComponent: () => import('./pages/profil/badges.page').then((m) => m.BadgesPage) },
      { path: 'profil/reglages', loadComponent: () => import('./pages/profil/reglages.page').then((m) => m.ReglagesPage) },
      { path: 'identifiant', loadComponent: () => import('./pages/identifiant/identifiant.page').then((m) => m.IdentifiantPage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage) },
      { path: 'compte', redirectTo: 'profil' },
      { path: 'archives', redirectTo: 'profil/archives' },
      {
        path: 'objectifs/nouveau',
        loadComponent: () => import('./pages/assistant/assistant.page').then((m) => m.AssistantPage),
      },
      {
        path: 'objectifs/nouveau/avance',
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
