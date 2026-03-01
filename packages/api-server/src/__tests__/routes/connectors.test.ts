import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server.js';
import type { FastifyInstance } from 'fastify';

describe('Connector routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  const testConnector = {
    id: 'github-test',
    type: 'github',
    name: 'Test GitHub',
    config: { org: 'acme-corp', token: 'xxx' },
    enabled: true,
  };

  it('GET /api/connectors returns empty array initially', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/connectors',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('POST /api/connectors creates a connector', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/connectors',
      payload: testConnector,
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBe('github-test');
    expect(body.type).toBe('github');
  });

  it('POST /api/connectors returns 400 without required fields', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/connectors',
      payload: { config: {} },
    });
    expect(response.statusCode).toBe(400);
  });

  it('POST /api/connectors returns 409 for duplicate', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/connectors',
      payload: testConnector,
    });
    expect(response.statusCode).toBe(409);
  });

  it('GET /api/connectors lists all connectors', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/connectors',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
  });

  it('GET /api/connectors/:id returns a specific connector', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/connectors/github-test',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe('github-test');
  });

  it('GET /api/connectors/:id returns 404 for unknown', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/connectors/nope',
    });
    expect(response.statusCode).toBe(404);
  });

  it('POST /api/connectors/:id/sync triggers sync', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/connectors/github-test/sync',
      payload: { mode: 'full' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.state).toBe('running');
    expect(body.connectorId).toBe('github-test');
  });

  it('GET /api/connectors/:id/status returns sync status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/connectors/github-test/status',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().connectorId).toBe('github-test');
  });

  it('DELETE /api/connectors/:id removes a connector', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/connectors/github-test',
    });
    expect(response.statusCode).toBe(204);

    const listResponse = await server.inject({
      method: 'GET',
      url: '/api/connectors',
    });
    expect(listResponse.json()).toEqual([]);
  });

  it('DELETE /api/connectors/:id returns 404 for unknown', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/connectors/nope',
    });
    expect(response.statusCode).toBe(404);
  });
});
