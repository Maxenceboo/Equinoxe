# Mes objectifs

App pour tenir des objectifs perso (ex. sport 3 fois par semaine, se coucher tôt) : on coche en un tap,
on voit sa semaine et son historique, et les rappels sont répartis tout seuls sur la semaine.

Cahier des charges : https://claude.ai/artifact/PZuVvTzm7RJPZJj7S9qzZ1

## Organisation

```
api/openapi.yaml   Contrat de l'API : seule source de vérité
backend/           Java 21 + Spring Boot 3, architecture hexagonale
frontend/          Angular 21 + PrimeNG 21, emballé pour Android avec Capacitor
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
cd backend && mvn test        # 23 tests : règles du domaine + parcours API (dont bilan, stats, binôme)
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
- **La flamme** est un SVG animé : quand la série est en cours, sa forme ondule doucement et son cœur bouge
  (morphing de tracés SVG). Elle grossit un instant quand la série augmente ; en célébration, quelques braises
  montent. Immobile et grise sans série.
- **Écran de célébration**, sobre et rare : semaine réussie (avec « Nouveau record ! » le cas échéant) et paliers
  de série quotidienne (7, 30, 100, 365 jours). Il se ferme seul après 2,5 s.
- Transitions en fondu entre écrans. Toutes les animations sont coupées si le téléphone demande de les réduire.
- **Bilan en haut de l'accueil** : objectifs tenus cette semaine et objectifs faits aujourd'hui.

## Fiabilité et confort

- **Joker** : un jour (objectif quotidien) ou une semaine ratée par mois ne casse pas la série. Il est utilisé
  automatiquement et revient chaque mois (`progression.jokersRestants`).
- **Rappels** : programmés pour 14 jours à chaque ouverture, plus un rappel de secours chaque lundi à 9 h qui
  continue même si l'app n'est pas ouverte.
- **Hors ligne** : la dernière liste reste affichée sans réseau ; les coches sont gardées sur le téléphone et
  envoyées automatiquement au retour du réseau.
- **Premier lancement** : quatre objectifs prêts à ajouter en un tap (sport, coucher, lecture, marche).
- **Archives** : les objectifs archivés se retrouvent depuis l'accueil et peuvent être restaurés
  (`POST /objectifs/{id}/restaurer`).

## Suivi et entraide

- **Bilan du dimanche** : le dimanche à 20 h, une notification ouvre l'écran Bilan (objectifs tenus, coches de la semaine comparées à la semaine d'avant, flamme de chaque objectif). Accessible aussi depuis l'icône graphique de l'accueil ; flèches pour revoir les semaines passées.
- **Cible qui s'adapte** : après 4 semaines réussies d'affilée, l'app propose +1 par semaine ; après 3 semaines ratées, -1. Une seule proposition à la fois sur l'accueil, « Plus tard » la fait taire 2 semaines. Après un changement de cible, le compte repart de zéro.
- **Rappel à l'heure habituelle** : option « Me rappeler à l'heure où je le fais d'habitude ». L'heure de chaque coche faite le jour même est gardée ; après 5 coches, le rappel passe 30 min avant la médiane des 10 dernières.
- **Objectifs chiffrés** : km, pages ou minutes, avec un total visé par semaine facultatif. La quantité est demandée juste après la coche ; l'accueil affiche « 12 / 20 km cette semaine ».
- **Statistiques** (page de l'objectif) : coches au total, moyenne par semaine, temps de sport noté ou total chiffré, barres des 6 derniers mois, types de séance les plus fréquents.
- **Binôme** : « Partager avec un ami » sur la page d'un objectif donne un code à 6 caractères. L'ami le saisit dans « Rejoindre avec un code » sur l'accueil et voit la progression et la flamme (pas les détails ni l'email complet).

## Direction artistique

À garder sur tous les écrans (règles dans `frontend/src/styles.scss` et `frontend/src/app/theme.ts`) :

- Fond noir pur, texte blanc, gris pour le secondaire, aucune autre couleur d'accent.
- Angles légèrement arrondis : 6 px partout (variable `--rayon`).
- Sélection et état « fait » : contour blanc, jamais de fond plein (choix, bouton fait, jours du calendrier).
- Fond blanc plein réservé à l'action principale (Enregistrer, Se connecter) et aux cases de progression.
- Titres très gras, petites étiquettes en capitales espacées, chiffres alignés.

## PrimeNG et licence

Le front reste sur PrimeNG 21 (avec Angular 21 et ngx-formly 7) : c'est la dernière version sans clé de
licence PrimeUI, donc sans bandeau « Invalid PrimeUI License ». PrimeNG 22 demande une clé (gratuite pour un
particulier) : pour y passer un jour, il faudra monter Angular en 22, ngx-formly en 11 et ajouter la clé
dans `providePrimeNG({ license })`.

## Configuration du back

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `APP_JWT_SECRET` | Secret de signature des jetons (32 caractères min.) | valeur de dev, à changer |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Base PostgreSQL (profil `postgres`) | localhost |
| `app.fuseau` | Fuseau horaire des calculs | Europe/Paris |
