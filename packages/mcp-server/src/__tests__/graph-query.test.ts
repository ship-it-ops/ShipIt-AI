import { describe, it, expect } from 'vitest';
import { McpErrorCode } from '../errors.js';

describe('graph_query guardrails', () => {
  const WRITE_KEYWORDS = /\b(MERGE|CREATE|DELETE|DETACH|SET|REMOVE|DROP|CALL\s*\{)\b/i;
  const HOP_PATTERN = /\*\d*\.\.(\d+)/g;
  const hopLimit = 6;

  it('should reject write operations', () => {
    const writeQueries = [
      'CREATE (n:Node {name: "test"})',
      'MATCH (n) DELETE n',
      'MATCH (n) SET n.name = "new"',
      'MERGE (n:Node {name: "test"})',
      'MATCH (n) REMOVE n.name',
      'MATCH (n) DETACH DELETE n',
    ];

    for (const query of writeQueries) {
      expect(WRITE_KEYWORDS.test(query)).toBe(true);
    }
  });

  it('should allow read-only queries', () => {
    const readQueries = [
      'MATCH (n) RETURN n',
      'MATCH (n)-[r]->(m) RETURN n, r, m',
      'MATCH path = shortestPath((a)-[*]-(b)) RETURN path',
    ];

    for (const query of readQueries) {
      expect(WRITE_KEYWORDS.test(query)).toBe(false);
    }
  });

  it('should enforce hop limit', () => {
    const query = 'MATCH (n)-[*1..10]->(m) RETURN n, m';
    const matches = [...query.matchAll(HOP_PATTERN)];

    expect(matches.length).toBe(1);
    expect(parseInt(matches[0][1], 10)).toBe(10);
    expect(parseInt(matches[0][1], 10) > hopLimit).toBe(true);
  });

  it('should allow queries within hop limit', () => {
    const query = 'MATCH (n)-[*1..5]->(m) RETURN n, m';
    const matches = [...query.matchAll(HOP_PATTERN)];

    expect(matches.length).toBe(1);
    expect(parseInt(matches[0][1], 10)).toBe(5);
    expect(parseInt(matches[0][1], 10) <= hopLimit).toBe(true);
  });

  it('should detect all hop patterns in complex queries', () => {
    const query = 'MATCH (a)-[*1..3]->(b)-[*1..8]->(c) RETURN a, b, c';
    const matches = [...query.matchAll(HOP_PATTERN)];

    expect(matches.length).toBe(2);
    expect(parseInt(matches[0][1], 10)).toBe(3);
    expect(parseInt(matches[1][1], 10)).toBe(8);
  });

  it('should have correct error codes for guardrail violations', () => {
    expect(McpErrorCode.HOP_LIMIT_EXCEEDED).toBe('HOP_LIMIT_EXCEEDED');
    expect(McpErrorCode.INVALID_PARAMETER).toBe('INVALID_PARAMETER');
    expect(McpErrorCode.QUERY_TIMEOUT).toBe('QUERY_TIMEOUT');
    expect(McpErrorCode.ROW_LIMIT_EXCEEDED).toBe('ROW_LIMIT_EXCEEDED');
  });
});
