import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { NavigationService, parent } from './navigation.service';

@Component({ template: '' })
class Vide {}

async function monter() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        ['', 'bilan', 'foyer', 'profil', 'profil/archives', 'connexion', 'objectifs/nouveau', 'objectifs/:id', 'objectifs/:id/modifier'].map(
          (path) => ({ path, component: Vide }),
        ),
      ),
    ],
  });
  const nav = TestBed.inject(NavigationService);
  const router = TestBed.inject(Router);
  const aller = async (url: string) => {
    await router.navigateByUrl(url);
  };
  const retour = async () => {
    nav.retour();
    await TestBed.inject(Router).navigated;
    await new Promise((r) => setTimeout(r));
  };
  return { nav, router, aller, retour };
}

describe('écran parent', () => {
  it('remonte de la modification au détail, du détail à la semaine', () => {
    expect(parent('/objectifs/4/modifier')).toBe('/objectifs/4');
    expect(parent('/objectifs/4')).toBe('/');
    expect(parent('/profil/archives')).toBe('/profil');
  });
});

describe('retour', () => {
  it("ramène à l'écran d'où l'on vient (bilan -> détail -> bilan)", async () => {
    const { router, aller, retour } = await monter();
    await aller('/');
    await aller('/bilan');
    await aller('/objectifs/3');
    await retour();
    expect(router.url).toBe('/bilan');
  });

  it("ne revient pas sur le formulaire après l'enregistrement", async () => {
    const { router, aller, retour } = await monter();
    await aller('/');
    await aller('/objectifs/3');
    await aller('/objectifs/3/modifier');
    await aller('/objectifs/3'); // enregistré
    await retour();
    expect(router.url).toBe('/');
  });

  it("sans historique (ouverture par notification), remonte à l'écran parent", async () => {
    const { router, aller, retour } = await monter();
    await aller('/objectifs/7/modifier');
    await retour();
    expect(router.url).toBe('/objectifs/7');
  });
});
