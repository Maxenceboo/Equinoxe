// Copie version.txt (la version stable) dans l'app, pour l'afficher à l'écran de lancement.
import { readFileSync, writeFileSync } from 'node:fs';
const version = readFileSync(new URL('../../version.txt', import.meta.url), 'utf8').trim();
// « play » pour le Play Store (pas de mise à jour par APK), « apk » pour le site
const canal = process.env.EQUINOXE_CANAL === 'play' ? 'play' : 'apk';
writeFileSync(new URL('../src/app/version.ts', import.meta.url),
  `// Généré par scripts/version.mjs à partir de version.txt : ne pas modifier à la main.\nexport const VERSION = '${version}';\nexport const CANAL: 'apk' | 'play' = '${canal}';\n`);
