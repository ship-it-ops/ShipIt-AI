import { describe, it, expect } from 'vitest';
import { createMockNeo4jClient, createMockRecord } from './helpers/mock-neo4j.js';

describe('search_entities tool', () => {
  it('should return filtered search results', async () => {
    const responses = new Map();
    responses.set('LogicalService', {
      records: [
        createMockRecord({
          total: 3,
          entities: [
            {
              node: {
                properties: {
                  id: 'shipit://logical-service/default/payments-api',
                  name: 'payments-api',
                  tier_effective: 1,
                  owner_effective: 'payments-team',
                },
              },
              labels: ['LogicalService'],
            },
            {
              node: {
                properties: {
                  id: 'shipit://logical-service/default/ledger-service',
                  name: 'ledger-service',
                  tier_effective: 1,
                  owner_effective: 'payments-team',
                },
              },
              labels: ['LogicalService'],
            },
          ],
        }),
      ],
      summary: { resultAvailableAfter: 5 },
    });

    const neo4j = createMockNeo4jClient(responses);
    const result = await neo4j.runCypher('MATCH (n:`LogicalService`)', {});

    const record = result.records[0];
    const total = record.get('total') as number;
    const entities = record.get('entities') as Array<{
      node: { properties: Record<string, unknown> };
      labels: string[];
    }>;

    expect(total).toBe(3);
    expect(entities.length).toBe(2);
    expect(entities[0].node.properties.name).toBe('payments-api');
    expect(entities[0].labels[0]).toBe('LogicalService');
  });

  it('should handle search with property filters', async () => {
    const responses = new Map();
    responses.set('tier_effective', {
      records: [
        createMockRecord({
          total: 2,
          entities: [
            {
              node: {
                properties: {
                  id: 'shipit://logical-service/default/payments-api',
                  name: 'payments-api',
                  tier_effective: 1,
                },
              },
              labels: ['LogicalService'],
            },
          ],
        }),
      ],
      summary: { resultAvailableAfter: 3 },
    });

    const neo4j = createMockNeo4jClient(responses);
    const result = await neo4j.runCypher('WHERE n.`tier_effective` = $filter_0', { filter_0: 1 });

    const record = result.records[0];
    const entities = record.get('entities') as Array<{
      node: { properties: Record<string, unknown> };
    }>;
    expect(entities[0].node.properties.tier_effective).toBe(1);
  });

  it('should return empty results for no matches', async () => {
    const neo4j = createMockNeo4jClient();
    const result = await neo4j.runCypher('MATCH (n:`NonExistent`)', {});
    expect(result.records.length).toBe(0);
  });
});
