import { parse as parseYaml } from 'yaml';
import type { ShipItSchema } from '../types/schema.js';
import { validateSchema } from './validator.js';

export function parseSchemaFile(yamlContent: string): ShipItSchema {
  const raw = parseYaml(yamlContent);
  const validated = validateSchema(raw);
  return validated;
}
