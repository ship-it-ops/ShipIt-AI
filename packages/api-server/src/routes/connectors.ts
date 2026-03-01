import type { FastifyPluginAsync } from 'fastify';
import { ConnectorManager, type ConnectorConfig } from '../services/connector-manager.js';

declare module 'fastify' {
  interface FastifyInstance {
    connectorManager: ConnectorManager;
  }
}

const connectorRoutes: FastifyPluginAsync = async (server) => {
  const manager = server.connectorManager;

  // GET /api/connectors
  server.get('/', async () => {
    return manager.getConnectors();
  });

  // POST /api/connectors
  server.post<{ Body: ConnectorConfig }>('/', async (request, reply) => {
    const config = request.body;
    if (!config.id || !config.type || !config.name) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'id, type, and name are required' },
      });
    }
    const connector = manager.addConnector(config);
    return reply.status(201).send(connector);
  });

  // GET /api/connectors/:id
  server.get<{ Params: { id: string } }>('/:id', async (request) => {
    return manager.getConnector(request.params.id);
  });

  // POST /api/connectors/:id/sync
  server.post<{ Params: { id: string }; Body: { mode?: 'full' | 'incremental' } }>(
    '/:id/sync',
    async (request) => {
      const mode = request.body?.mode ?? 'full';
      return manager.triggerSync(request.params.id, mode);
    },
  );

  // GET /api/connectors/:id/status
  server.get<{ Params: { id: string } }>('/:id/status', async (request) => {
    return manager.getSyncStatus(request.params.id);
  });

  // DELETE /api/connectors/:id
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    manager.removeConnector(request.params.id);
    return reply.status(204).send();
  });
};

export default connectorRoutes;
