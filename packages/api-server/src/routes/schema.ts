import type { FastifyPluginAsync } from 'fastify';
import type { SchemaService } from '../services/schema-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    schemaService: SchemaService;
  }
}

const schemaRoutes: FastifyPluginAsync = async (server) => {
  const service = server.schemaService;

  // GET /api/schema
  server.get('/', async (_request, reply) => {
    const schema = service.getSchema();
    if (!schema) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No schema loaded' },
      });
    }
    return schema;
  });

  // PUT /api/schema
  server.put<{ Body: string }>('/', async (request, reply) => {
    const yamlContent = request.body;
    if (!yamlContent || typeof yamlContent !== 'string') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request body must be a YAML string' },
      });
    }
    try {
      const schema = await service.updateSchema(yamlContent);
      return schema;
    } catch (err) {
      return reply.status(400).send({
        error: { code: 'SCHEMA_INVALID', message: (err as Error).message },
      });
    }
  });

  // POST /api/schema/validate
  server.post<{ Body: string }>('/validate', async (request, reply) => {
    const yamlContent = request.body;
    if (!yamlContent || typeof yamlContent !== 'string') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request body must be a YAML string' },
      });
    }
    const result = service.validateSchema(yamlContent);
    if (!result.valid) {
      return reply.status(400).send({
        error: { code: 'SCHEMA_INVALID', message: result.error },
      });
    }
    return { valid: true, schema: result.schema };
  });
};

export default schemaRoutes;
