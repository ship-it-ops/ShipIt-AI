import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? 'INTERNAL_ERROR';
  const message = statusCode >= 500 ? 'Internal server error' : error.message;

  reply.status(statusCode).send({
    error: { code, message },
  });
}
