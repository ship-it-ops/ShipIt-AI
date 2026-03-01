import { readFile, writeFile } from 'node:fs/promises';
import { parseSchemaFile, validateSchema, type ShipItSchema } from '@shipit-ai/shared';
import { stringify as stringifyYaml } from 'yaml';

export class SchemaService {
  private schema: ShipItSchema | null = null;
  private schemaPath: string;

  constructor(schemaPath: string) {
    this.schemaPath = schemaPath;
  }

  async loadSchema(path?: string): Promise<ShipItSchema> {
    const filePath = path ?? this.schemaPath;
    const content = await readFile(filePath, 'utf-8');
    this.schema = parseSchemaFile(content);
    return this.schema;
  }

  getSchema(): ShipItSchema | null {
    return this.schema;
  }

  async updateSchema(yamlContent: string): Promise<ShipItSchema> {
    const validated = parseSchemaFile(yamlContent);
    await writeFile(this.schemaPath, yamlContent, 'utf-8');
    this.schema = validated;
    return validated;
  }

  validateSchema(yamlContent: string): { valid: boolean; schema?: ShipItSchema; error?: string } {
    try {
      const schema = parseSchemaFile(yamlContent);
      return { valid: true, schema };
    } catch (err) {
      return { valid: false, error: (err as Error).message };
    }
  }
}
