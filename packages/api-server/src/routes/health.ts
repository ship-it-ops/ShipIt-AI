import type { FastifyPluginAsync } from 'fastify';

const startTime = Date.now();

const healthRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async () => {
    return {
      status: 'ok',
      version: '0.1.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });
};

export default healthRoutes;
