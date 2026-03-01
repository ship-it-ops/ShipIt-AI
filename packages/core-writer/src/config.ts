export interface CoreWriterConfig {
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database?: string;
  };
  batchSize: number;
  idempotencyTtlDays: number;
  defaultDecayRate: number;
}

export const DEFAULT_CONFIG: CoreWriterConfig = {
  neo4j: {
    uri: process.env['NEO4J_URI'] ?? 'bolt://localhost:7687',
    username: process.env['NEO4J_USERNAME'] ?? 'neo4j',
    password: process.env['NEO4J_PASSWORD'] ?? 'password',
    database: process.env['NEO4J_DATABASE'] ?? 'neo4j',
  },
  batchSize: 500,
  idempotencyTtlDays: 30,
  defaultDecayRate: 0.01,
};
