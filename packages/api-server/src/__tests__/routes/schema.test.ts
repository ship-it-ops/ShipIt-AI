import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server.js';
import { SchemaService } from '../../services/schema-service.js';
import { DEFAULT_SCHEMA } from '@shipit-ai/shared';
import { stringify as stringifyYaml } from 'yaml';
import type { FastifyInstance } from 'fastify';

const validYaml = stringifyYaml(DEFAULT_SCHEMA);

const invalidYaml = `
version: "1.0"
mode: "invalid_mode"
node_types: {}
relationship_types: {}
`;

describe('Schema routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    const schemaService = new SchemaService('/tmp/test-schema.yaml');
    // Pre-load with default schema
    (schemaService as unknown as { schema: unknown }).schema = DEFAULT_SCHEMA;

    server = await createServer({ schemaService });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/schema returns the current schema', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/schema',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.version).toBe('1.0');
    expect(body.mode).toBe('full');
    expect(body.node_types).toBeDefined();
  });

  it('POST /api/schema/validate with valid YAML returns 200', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/schema/validate',
      headers: { 'content-type': 'text/plain' },
      payload: validYaml,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.valid).toBe(true);
  });

  it('POST /api/schema/validate with invalid YAML returns 400', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/schema/validate',
      headers: { 'content-type': 'text/plain' },
      payload: invalidYaml,
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('SCHEMA_INVALID');
  });

  it('PUT /api/schema with invalid YAML returns 400', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/api/schema',
      headers: { 'content-type': 'text/plain' },
      payload: invalidYaml,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('Schema routes - no schema loaded', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer({
      schemaService: new SchemaService('/tmp/nonexistent.yaml'),
    });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/schema returns 404 when no schema loaded', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/schema',
    });
    expect(response.statusCode).toBe(404);
  });
});
