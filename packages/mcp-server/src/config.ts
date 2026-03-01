export interface McpServerConfig {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  apiKeySecret?: string;
  rateLimits: {
    graphQueryPerDay: number;
    rowLimit: number;
    hopLimit: number;
    queryTimeoutMs: number;
  };
}

export function loadConfig(): McpServerConfig {
  return {
    neo4jUri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    neo4jUser: process.env.NEO4J_USER ?? 'neo4j',
    neo4jPassword: process.env.NEO4J_PASSWORD ?? 'password',
    apiKeySecret: process.env.MCP_API_KEY_SECRET,
    rateLimits: {
      graphQueryPerDay: parseInt(process.env.MCP_GRAPH_QUERY_LIMIT ?? '100', 10),
      rowLimit: parseInt(process.env.MCP_ROW_LIMIT ?? '1000', 10),
      hopLimit: parseInt(process.env.MCP_HOP_LIMIT ?? '6', 10),
      queryTimeoutMs: parseInt(process.env.MCP_QUERY_TIMEOUT_MS ?? '10000', 10),
    },
  };
}
