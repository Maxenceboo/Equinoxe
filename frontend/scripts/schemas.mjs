// Extrait les schémas de l'OpenAPI vers un JSON Schema utilisé pour construire les formulaires.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { load } from 'js-yaml';

const spec = load(readFileSync(new URL('../../api/openapi.yaml', import.meta.url), 'utf8'));
const json = JSON.stringify({ definitions: spec.components.schemas }).replaceAll(
  '#/components/schemas/',
  '#/definitions/',
);
const sortie = new URL('../src/app/api/generated/', import.meta.url);
mkdirSync(sortie, { recursive: true });
writeFileSync(new URL('schemas.json', sortie), JSON.stringify(JSON.parse(json), null, 2));
console.log('Schémas de formulaire générés dans src/app/api/generated/schemas.json');
