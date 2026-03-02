'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNeighborhood, type GraphData } from '@/lib/api';

export function useGraphData(nodeId?: string, depth: number = 2) {
  return useQuery<GraphData>({
    queryKey: ['graph-neighborhood', nodeId, depth],
    queryFn: () => fetchNeighborhood(nodeId!, depth),
    enabled: !!nodeId,
    retry: 1,
  });
}

export function useInitialGraphData() {
  return useQuery<GraphData>({
    queryKey: ['graph-initial'],
    queryFn: () => fetchNeighborhood('tier1', 2),
    retry: 1,
  });
}
