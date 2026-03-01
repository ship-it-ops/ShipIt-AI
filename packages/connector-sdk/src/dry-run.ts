import type { CanonicalNode, CanonicalEdge } from '@shipit-ai/shared';
import type { ShipItConnector, ConnectorConfig } from './interface.js';

export interface DryRunSummary {
  total_nodes: number;
  total_edges: number;
  nodes_by_type: Record<string, number>;
  edges_by_type: Record<string, number>;
  entity_types_discovered: string[];
}

export interface DryRunResult {
  sample_nodes: CanonicalNode[];
  sample_edges: CanonicalEdge[];
  summary: DryRunSummary;
}

const MAX_SAMPLE_NODES = 50;
const MAX_SAMPLE_EDGES = 20;

export async function dryRun(
  connector: ShipItConnector,
  config: ConnectorConfig,
): Promise<DryRunResult> {
  const auth = await connector.authenticate(config);
  if (!auth.success) {
    throw new Error(`Authentication failed: ${auth.error ?? 'unknown error'}`);
  }

  const discovery = await connector.discover();

  const allNodes: CanonicalNode[] = [];
  const allEdges: CanonicalEdge[] = [];

  for (const entityType of discovery.entity_types) {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await connector.fetch(entityType, cursor);
      if (result.entities.length > 0) {
        const normalized = connector.normalize(result.entities);
        allNodes.push(...normalized.nodes);
        allEdges.push(...normalized.edges);
      }
      cursor = result.cursor;
      hasMore = result.has_more;
    }
  }

  const nodesByType: Record<string, number> = {};
  for (const node of allNodes) {
    nodesByType[node.label] = (nodesByType[node.label] ?? 0) + 1;
  }

  const edgesByType: Record<string, number> = {};
  for (const edge of allEdges) {
    edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
  }

  return {
    sample_nodes: allNodes.slice(0, MAX_SAMPLE_NODES),
    sample_edges: allEdges.slice(0, MAX_SAMPLE_EDGES),
    summary: {
      total_nodes: allNodes.length,
      total_edges: allEdges.length,
      nodes_by_type: nodesByType,
      edges_by_type: edgesByType,
      entity_types_discovered: discovery.entity_types,
    },
  };
}
