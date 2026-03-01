import neo4j, { type Driver, type Record as Neo4jRecord } from 'neo4j-driver';

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeCountsByLabel: Record<string, number>;
  edgeCountsByType: Record<string, number>;
}

export interface CytoscapeNode {
  data: { id: string; label: string; [key: string]: unknown };
}

export interface CytoscapeEdge {
  data: { source: string; target: string; type: string; [key: string]: unknown };
}

export interface NeighborhoodResult {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export class Neo4jService {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async runQuery(cypher: string, params: Record<string, unknown> = {}): Promise<Neo4jRecord[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  async getGraphStats(): Promise<GraphStats> {
    const nodeCountsResult = await this.runQuery(
      'CALL db.labels() YIELD label RETURN label, COUNT { MATCH (n) WHERE label IN labels(n) } AS count',
    );
    const edgeCountsResult = await this.runQuery(
      'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType, COUNT { MATCH ()-[r]->() WHERE type(r) = relationshipType } AS count',
    );

    const nodeCountsByLabel: Record<string, number> = {};
    let totalNodes = 0;
    for (const record of nodeCountsResult) {
      const label = record.get('label') as string;
      const count = (record.get('count') as { toNumber?: () => number });
      const num = typeof count === 'object' && count?.toNumber ? count.toNumber() : Number(count);
      nodeCountsByLabel[label] = num;
      totalNodes += num;
    }

    const edgeCountsByType: Record<string, number> = {};
    let totalEdges = 0;
    for (const record of edgeCountsResult) {
      const relType = record.get('relationshipType') as string;
      const count = (record.get('count') as { toNumber?: () => number });
      const num = typeof count === 'object' && count?.toNumber ? count.toNumber() : Number(count);
      edgeCountsByType[relType] = num;
      totalEdges += num;
    }

    return { totalNodes, totalEdges, nodeCountsByLabel, edgeCountsByType };
  }

  async getNeighborhood(nodeId: string, depth: number = 2): Promise<NeighborhoodResult> {
    const records = await this.runQuery(
      `MATCH (start {id: $nodeId})
       CALL apoc.path.subgraphAll(start, {maxLevel: $depth})
       YIELD nodes, relationships
       RETURN nodes, relationships`,
      { nodeId, depth: neo4j.int(depth) },
    );

    const nodesMap = new Map<string, CytoscapeNode>();
    const edges: CytoscapeEdge[] = [];

    for (const record of records) {
      const nodes = record.get('nodes') as Array<{ properties: Record<string, unknown>; labels: string[] }>;
      const rels = record.get('relationships') as Array<{
        properties: Record<string, unknown>;
        type: string;
        start: { toString(): string };
        end: { toString(): string };
      }>;

      for (const node of nodes) {
        const id = String(node.properties.id ?? node.properties.name ?? '');
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            data: {
              id,
              label: node.labels[0] ?? 'Unknown',
              ...node.properties,
            },
          });
        }
      }

      for (const rel of rels) {
        edges.push({
          data: {
            source: String(rel.start),
            target: String(rel.end),
            type: rel.type,
            ...rel.properties,
          },
        });
      }
    }

    return { nodes: Array.from(nodesMap.values()), edges };
  }

  async searchEntities(opts: {
    label?: string;
    filters?: Record<string, unknown>;
    limit?: number;
    sortBy?: string;
  }): Promise<Neo4jRecord[]> {
    const { label, filters = {}, limit = 25, sortBy } = opts;
    const nodeLabel = label ? `:${label}` : '';
    const whereClause: string[] = [];
    const params: Record<string, unknown> = { limit: neo4j.int(limit) };

    for (const [key, value] of Object.entries(filters)) {
      whereClause.push(`n.${key} = $filter_${key}`);
      params[`filter_${key}`] = value;
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    const order = sortBy ? `ORDER BY n.${sortBy}` : '';
    const cypher = `MATCH (n${nodeLabel}) ${where} RETURN n ${order} LIMIT $limit`;

    return this.runQuery(cypher, params);
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
