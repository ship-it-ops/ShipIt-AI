import neo4j, { type Driver, type Session, type Record as Neo4jRecord } from 'neo4j-driver';

export interface CypherResult {
  records: Neo4jRecord[];
  summary: {
    resultAvailableAfter: number;
  };
}

export interface Neo4jClient {
  runCypher(query: string, params?: Record<string, unknown>): Promise<CypherResult>;
  close(): Promise<void>;
}

export function createNeo4jClient(uri: string, user: string, password: string): Neo4jClient {
  const driver: Driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  return {
    async runCypher(query: string, params: Record<string, unknown> = {}): Promise<CypherResult> {
      const session: Session = driver.session({ defaultAccessMode: neo4j.session.READ });
      try {
        const result = await session.run(query, params);
        return {
          records: result.records,
          summary: {
            resultAvailableAfter: result.summary.resultAvailableAfter.toNumber(),
          },
        };
      } finally {
        await session.close();
      }
    },

    async close(): Promise<void> {
      await driver.close();
    },
  };
}
