import { Injectable, inject } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import schemas from '../api/generated/schemas.json';

type JSONSchema = Record<string, unknown>;
type NomSchema = keyof typeof schemas.definitions;

export const messagesValidation = [
  { name: 'required', message: 'Champ obligatoire' },
  { name: 'minLength', message: (_: unknown, f: FormlyFieldConfig) => `Au moins ${f.props?.minLength} caractères` },
  { name: 'maxLength', message: (_: unknown, f: FormlyFieldConfig) => `Au plus ${f.props?.maxLength} caractères` },
  { name: 'min', message: (_: unknown, f: FormlyFieldConfig) => `Minimum ${f.props?.min}` },
  { name: 'max', message: (_: unknown, f: FormlyFieldConfig) => `Maximum ${f.props?.max}` },
  { name: 'pattern', message: 'Format invalide' },
  { name: 'email', message: 'Email invalide' },
];

/**
 * Construit les formulaires à partir des schémas de l'OpenAPI (api/openapi.yaml).
 * Libellés (title), champs obligatoires, bornes, formats et listes de choix viennent du contrat.
 */
@Injectable({ providedIn: 'root' })
export class SchemaFormService {
  private readonly jsonschema = inject(FormlyJsonschema);

  champs(nom: NomSchema, ajustements: Record<string, Partial<FormlyFieldConfig>> = {}): FormlyFieldConfig[] {
    const racine = { ...(schemas.definitions[nom] as JSONSchema), definitions: schemas.definitions };
    const config = this.jsonschema.toFieldConfig(racine as never, {
      map: (champ: FormlyFieldConfig, schema: JSONSchema) => this.adapter(champ, schema),
    });
    const champs = config.fieldGroup ?? [];
    for (const champ of champs) {
      const ajustement = ajustements[String(champ.key)];
      if (ajustement) Object.assign(champ, { ...ajustement, props: { ...champ.props, ...ajustement.props } });
    }
    return champs;
  }

  private adapter(champ: FormlyFieldConfig, schema: JSONSchema): FormlyFieldConfig {
    const choix = schema['enum'] as (string | number)[] | undefined;
    const libelles = schema['x-enum-descriptions'] as string[] | undefined;
    if (choix && champ.props) {
      // Un tap par choix : boutons radio avec les libellés français du contrat
      champ.type = 'radio';
      champ.props.options = choix.map((valeur, i) => ({ value: valeur, label: libelles?.[i] ?? String(valeur) }));
    }
    const format = schema['format'];
    if (champ.props) {
      if (format === 'password') champ.props.type = 'password';
      if (format === 'email') champ.props.type = 'email';
      if (typeof schema['pattern'] === 'string' && (schema['pattern'] as string).includes(':[0-5]')) {
        champ.props.type = 'time';
      }
      if (typeof schema['pattern'] === 'string' && (schema['pattern'] as string).startsWith('^#')) {
        champ.props.type = 'color';
      }
    }
    return champ;
  }
}
