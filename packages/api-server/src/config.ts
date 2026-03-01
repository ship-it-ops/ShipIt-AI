export interface ServerConfig {
  port: number;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  redisUrl: string;
  schemaPath: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    neo4jUri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    neo4jUser: process.env.NEO4J_USER ?? 'neo4j',
    neo4jPassword: process.env.NEO4J_PASSWORD ?? 'password',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    schemaPath: process.env.SCHEMA_PATH ?? './shipit-schema.yaml',
  };
}
