import type { FastifyPluginAsync } from 'fastify';
import type { Neo4jService } from '../services/neo4j-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    neo4jService: Neo4jService;
  }
}

const graphRoutes: FastifyPluginAsync = async (server) => {
  const neo4j = server.neo4jService;

  // GET /api/graph/stats
  server.get('/stats', async () => {
    return neo4j.getGraphStats();
  });

  // GET /api/graph/neighborhood/:id
  server.get<{
    Params: { id: string };
    Querystring: { depth?: string };
  }>('/neighborhood/:id', async (request) => {
    const depth = Math.min(Number(request.query.depth ?? 2), 5);
    return neo4j.getNeighborhood(request.params.id, depth);
  });

  // GET /api/graph/search
  server.get<{
    Querystring: {
      label?: string;
      q?: string;
      tier?: string;
      owner?: string;
      limit?: string;
    };
  }>('/search', async (request) => {
    const { label, q, tier, owner, limit } = request.query;
    const filters: Record<string, unknown> = {};
    if (q) filters.name = q;
    if (tier) filters.tier = tier;
    if (owner) filters.owner = owner;

    const records = await neo4j.searchEntities({
      label,
      filters,
      limit: limit ? Number(limit) : 25,
    });

    return records.map((record) => {
      const node = record.get('n');
      return node.properties;
    });
  });
};

export default graphRoutes;
