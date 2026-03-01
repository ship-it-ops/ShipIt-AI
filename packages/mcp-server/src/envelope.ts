export interface DataQuality {
  stale_nodes: number;
  single_source_nodes: number;
}

export interface McpResponseMeta {
  tool: string;
  version: string;
  query_time_ms: number;
  node_count: number;
  truncated: boolean;
  data_quality: DataQuality;
  cache_hit: boolean;
  warnings?: string[];
  suggested_follow_up?: string[];
  next_cursor?: string;
}

export interface McpResponse<T> {
  _meta: McpResponseMeta;
  data: T;
}

export interface WrapResponseOpts {
  queryTimeMs?: number;
  nodeCount?: number;
  truncated?: boolean;
  dataQuality?: DataQuality;
  cacheHit?: boolean;
  warnings?: string[];
  suggestedFollowUp?: string[];
  nextCursor?: string;
  compact?: boolean;
}

export function wrapResponse<T>(
  tool: string,
  data: T,
  opts: WrapResponseOpts = {},
): McpResponse<T> | T {
  if (opts.compact) {
    return data;
  }

  return {
    _meta: {
      tool,
      version: '1.0',
      query_time_ms: opts.queryTimeMs ?? 0,
      node_count: opts.nodeCount ?? 0,
      truncated: opts.truncated ?? false,
      data_quality: opts.dataQuality ?? { stale_nodes: 0, single_source_nodes: 0 },
      cache_hit: opts.cacheHit ?? false,
      ...(opts.warnings?.length ? { warnings: opts.warnings } : {}),
      ...(opts.suggestedFollowUp?.length ? { suggested_follow_up: opts.suggestedFollowUp } : {}),
      ...(opts.nextCursor ? { next_cursor: opts.nextCursor } : {}),
    },
    data,
  };
}
