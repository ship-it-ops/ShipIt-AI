import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server.js';
import type { FastifyInstance } from 'fastify';

describe('Health route', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(typeof body.uptime).toBe('number');
  });
});
