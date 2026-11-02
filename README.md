# Mes objectifs

App pour tenir des objectifs perso (ex. sport 3 fois par semaine, se coucher tôt) : on coche en un tap,
on voit sa semaine et son historique, et les rappels sont répartis tout seuls sur la semaine.

Cahier des charges : https://claude.ai/artifact/PZuVvTzm7RJPZJj7S9qzZ1

## Organisation

```
api/openapi.yaml       Contrat des données : seule source de vérité pour les VO et les formulaires
supabase/              Base de données, comptes et sécurité (migrations SQL), rien à héberger
frontend/              Angular 21 + PrimeNG 21, emballé pour Android avec Capacitor
```

Il n'y a pas de serveur à faire tourner : l'app parle directement à Supabase (offre gratuite), qui gère la
base PostgreSQL, les comptes (email + mot de passe) et la sécurité. Toutes les règles de l'app (flammes,
jokers, rappels, bilan, stats, cible qui s'adapte) tournent dans l'app.

### Contract-first

- `api/openapi.yaml` décrit les objets échangés entre les écrans et les cas d'utilisation (Objectif,
  ProgressionSemaine, Bilan, Statistiques…). `npm run generate` génère les VO TypeScript dans
  `frontend/src/app/api/generated`, plus `schemas.json`. Le code généré n'est pas commité.
- Formulaires : `SchemaFormService` construit les champs ngx-formly (rendu PrimeNG) à partir des schémas
  du contrat. Libellés (`title`), champs obligatoires, bornes, formats et choix (`enum` + `x-enum-descriptions`)
  viennent de l'OpenAPI : modifier un schéma met à jour le formulaire.
- Base : les types des tables sont générés depuis Supabase dans `frontend/src/app/donnees/database.types.ts`
  (`npx supabase gen types typescript --local`).

### Architecture hexagonale (dans le front)

```
src/app/domaine/       Règles, en TypeScript pur (ni Angular ni Supabase) et testées :
                       progression et séries + joker, rappels espacés, conseil de cible, bilan, stats,
                       heure habituelle
src/app/application/   Cas d'utilisation (ObjectifsService, BilanService, BinomesService, RappelsService,
                       AuthService) : chargent les données, appliquent le domaine, renvoient les VO du contrat
src/app/donnees/       Adaptateur Supabase : client, dépôt des objectifs et des coches, types de la base
src/app/pages, core    Écrans et services d'interface (notifications, hors ligne, célébrations…)
```

Règle des rappels : pour N séances par semaine, l'écart idéal est de 7 / N jours (3 séances : lundi, mercredi,
vendredi). Après chaque séance cochée, les rappels restants sont recalculés sur les jours qui restent.
Pas de rappel un jour déjà coché ni quand la semaine est atteinte. Sommeil : rappel chaque soir 30 min avant
l'heure de coucher visée.

### Sécurité (Supabase)

- Row Level Security sur toutes les tables : chacun ne lit et ne modifie que ses objectifs et ses coches.
- Binôme par trois fonctions SQL (`partager_objectif`, `rejoindre_binome`, `objectifs_suivis`) : l'ami
  n'obtient que le nom, la cible et les jours cochés de l'objectif partagé, et le début de l'email
  (avant l'arobase). Jamais les détails, les quantités ni les autres objectifs.
- Le code de partage ne peut pas être modifié à la main (déclencheur).

## Lancer en local

Prérequis : Node 22 et Docker (pour le Supabase local).

```bash
npx supabase start     # Supabase local (http://127.0.0.1:54321), applique supabase/migrations
cd frontend
npm install
npm start              # http://localhost:4200
```

`src/app/supabase.config.ts` pointe par défaut sur le Supabase local.

## Mettre en ligne avec Supabase (gratuit)

1. Créer un compte sur https://supabase.com puis un projet (offre Free, région Europe).
2. Dans le projet : **Authentication > Sign In / Providers > Email**, désactiver « Confirm email » pour
   pouvoir se connecter tout de suite après l'inscription (ou le laisser : l'app demande alors de cliquer
   le lien reçu par mail).
3. Appliquer le schéma : `npx supabase login`, `npx supabase link --project-ref <ref du projet>`, puis
   `npx supabase db push`. (Ou copier le contenu de `supabase/migrations/*.sql` dans **SQL Editor** et
   l'exécuter.)
4. **Project Settings > API Keys** : copier l'URL du projet et la clé « publishable » dans
   `frontend/src/app/supabase.config.ts`. Cette clé peut être publique : la sécurité vient des règles RLS.
5. Rebuild l'app (`npm run build` ou `npm run android`).

À savoir sur l'offre gratuite : un projet sans aucune activité pendant une semaine est mis en pause
(on le relance d'un clic depuis le tableau de bord) ; une app utilisée chaque jour n'est pas concernée.

Pour changer la base plus tard : `npx supabase migration new <nom>`, écrire le SQL, tester avec
`npx supabase db reset` en local, puis `npx supabase db push`. Ne jamais modifier une migration déjà appliquée.

## Tests

```bash
cd frontend && npm test       # règles du domaine (flammes, jokers, rappels, cible, bilan, stats) + dates
```

Les règles de sécurité de la base et le parcours complet (connexion, coches, binôme, hors ligne…) ont été
vérifiés contre un Supabase local.

## Android

Prérequis : Android Studio.

```bash
cd frontend
npm run android     # build Angular, synchronise Capacitor, ouvre Android Studio
```

Dans Android Studio, lancer l'app sur un téléphone ou un émulateur. Avec le Supabase local, mettre dans
`supabase.config.ts` l'adresse de l'ordinateur (`http://10.0.2.2:54321` pour l'émulateur,
`http://<IP de l'ordinateur>:54321` pour un vrai téléphone sur le même Wi-Fi) ; avec le vrai projet Supabase,
rien à faire.

Les notifications sont programmées sur le téléphone (plugin Capacitor Local Notifications), calculées par
le domaine à l'ouverture de l'app et après chaque changement.

Pour le Play Store : mettre `androidScheme: 'https'` dans `capacitor.config.ts`, générer un `.aab` signé
depuis Android Studio (Build > Generate Signed Bundle).

## Motivation

- **Flamme de série** sur chaque objectif : jours d'affilée pour un objectif quotidien, semaines réussies
  d'affilée sinon. Une journée ou une semaine en cours pas encore faite ne casse pas la série. Calculée par le
  domaine (`domaine/progression.ts`).
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
  automatiquement et revient chaque mois.
- **Rappels** : programmés pour 14 jours à chaque ouverture, plus un rappel de secours chaque lundi à 9 h qui
  continue même si l'app n'est pas ouverte.
- **Hors ligne** : la dernière liste reste affichée sans réseau ; les coches sont gardées sur le téléphone et
  envoyées automatiquement au retour du réseau.
- **Premier lancement** : quatre objectifs prêts à ajouter en un tap (sport, coucher, lecture, marche).
- **Archives** : les objectifs archivés se retrouvent depuis l'accueil et peuvent être restaurés.

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
