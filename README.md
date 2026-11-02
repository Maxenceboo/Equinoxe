# Mes objectifs

App pour tenir des objectifs perso (ex. sport 3 fois par semaine, se coucher tôt) : on coche en un tap,
on voit sa semaine et son historique, et les rappels sont répartis tout seuls sur la semaine.

Cahier des charges : https://claude.ai/artifact/PZuVvTzm7RJPZJj7S9qzZ1

## Organisation

```
api/openapi.yaml   Contrat de l'API : seule source de vérité
backend/           Java 21 + Spring Boot 3, architecture hexagonale
frontend/          Angular 22 + PrimeNG, emballé pour Android avec Capacitor
```

### API en contract-first

- `api/openapi.yaml` décrit l'API.
- Back : `mvn generate-sources` génère les interfaces des contrôleurs et les VO Java (suffixe `VO`)
  dans `backend/target/generated-sources` ; les contrôleurs de `adapter/in/web` les implémentent.
- Front : `npm run generate` génère les services Angular et les VO TypeScript dans
  `frontend/src/app/api/generated`, plus `schemas.json`.
- Formulaires : `SchemaFormService` construit les champs ngx-formly (rendu PrimeNG) à partir des schémas
  du contrat. Libellés (`title`), champs obligatoires, bornes, formats et choix (`enum` + `x-enum-descriptions`)
  viennent de l'OpenAPI : modifier un schéma met à jour le formulaire.

Le code généré n'est pas commité, il est régénéré à chaque build.

### Back hexagonal

```
domain/        Modèle (Objectif, Validation, Frequence, Semaine…) et règles, sans Spring
  service/     CalculProgression (semaine, séries, taux) et PlanificateurRappels (rappels espacés)
application/
  port/in      Cas d'usage (GererObjectifsUseCase, RappelsUseCase, AuthUseCase)
  port/out     ObjectifRepository, UtilisateurRepository, Horloge, HacheurMotDePasse, EmetteurJeton
  service/     Implémentations des cas d'usage
adapter/
  in/web       Contrôleurs REST (implémentent les interfaces générées) + conversion VO <-> domaine
  out/…        JPA, BCrypt, JWT, horloge
config/        Branchement des cas d'usage et sécurité
```

Règle des rappels : pour N séances par semaine, l'écart idéal est de 7 / N jours (3 séances : lundi, mercredi,
vendredi). Après chaque séance cochée, les rappels restants sont recalculés sur les jours qui restent.
Pas de rappel un jour déjà coché ni quand la semaine est atteinte. Sommeil : rappel chaque soir 30 min avant
l'heure de coucher visée.

## Lancer en local

Prérequis : Java 21, Maven, Node 22.

```bash
# 1. Back (port 8080, base H2 dans backend/data, rien à installer)
cd backend
mvn spring-boot:run

# 2. Front (http://localhost:4200)
cd frontend
npm install
npm start
```

Ouvrir http://localhost:4200, créer un compte, puis un objectif.

Avec PostgreSQL au lieu de H2 : `docker compose up -d` à la racine, puis
`mvn spring-boot:run -Dspring-boot.run.profiles=postgres`.

## Tests

```bash
cd backend && mvn test        # 15 tests : règles du domaine + parcours API complet
cd frontend && npm test       # tests unitaires du front
```

## Android

Prérequis : Android Studio.

```bash
cd frontend
npm run android     # build Angular, synchronise Capacitor, ouvre Android Studio
```

Dans Android Studio, lancer l'app sur un téléphone ou un émulateur. Sur l'écran de connexion, ouvrir
« Adresse du serveur » et mettre l'adresse de l'ordinateur qui fait tourner le back :
`http://10.0.2.2:8080/api` pour l'émulateur, `http://<IP de l'ordinateur>:8080/api` pour un vrai téléphone
sur le même Wi-Fi.

Les notifications sont programmées sur le téléphone (plugin Capacitor Local Notifications) à partir de
`GET /rappels`, à l'ouverture de l'app et après chaque changement.

Pour le Play Store : passer le serveur en https, mettre `androidScheme: 'https'` dans `capacitor.config.ts`,
générer un `.aab` signé depuis Android Studio (Build > Generate Signed Bundle).

## Motivation

- **Flamme de série** sur chaque objectif : jours d'affilée pour un objectif quotidien, semaines réussies
  d'affilée sinon. Une journée ou une semaine en cours pas encore faite ne casse pas la série. Calculée par le
  domaine (`CalculProgression.serie`), renvoyée dans `progression.serie`, `meilleureSerie` et `uniteSerie`.
- **À chaque coche** : vibration légère, coche qui se trace, case de progression qui se remplit. Un petit son
  discret si le son est activé (coupé par défaut, bouton haut-parleur sur l'accueil).
- **La flamme** grossit un instant quand la série augmente.
- **Écran de célébration**, sobre et rare : semaine réussie (avec « Nouveau record ! » le cas échéant) et paliers
  de série quotidienne (7, 30, 100, 365 jours). Il se ferme seul après 2,5 s.
- Transitions en fondu entre écrans. Toutes les animations sont coupées si le téléphone demande de les réduire.
- **Bilan en haut de l'accueil** : objectifs tenus cette semaine et objectifs faits aujourd'hui.

## Direction artistique

À garder sur tous les écrans (règles dans `frontend/src/styles.scss` et `frontend/src/app/theme.ts`) :

- Fond noir pur, texte blanc, gris pour le secondaire, aucune autre couleur d'accent.
- Angles légèrement arrondis : 6 px partout (variable `--rayon`).
- Sélection et état « fait » : contour blanc, jamais de fond plein (choix, bouton fait, jours du calendrier).
- Fond blanc plein réservé à l'action principale (Enregistrer, Se connecter) et aux cases de progression.
- Titres très gras, petites étiquettes en capitales espacées, chiffres alignés.

## PrimeNG et licence

PrimeNG 21 et plus demandent une clé de licence PrimeUI. Elle est gratuite pour un particulier
(Community License : https://primeui.dev/licenses/community). Sans clé l'app marche, mais affiche un bandeau
« Invalid PrimeUI License ». Coller la clé dans `frontend/src/app/primeui-license.ts`.

## Configuration du back

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `APP_JWT_SECRET` | Secret de signature des jetons (32 caractères min.) | valeur de dev, à changer |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Base PostgreSQL (profil `postgres`) | localhost |
| `app.fuseau` | Fuseau horaire des calculs | Europe/Paris |
