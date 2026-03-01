'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNeighborhood, type GraphData } from '@/lib/api';
import { mockGraphData } from '@/lib/mock-data';

export function useGraphData(nodeId?: string, depth: number = 2) {
  return useQuery<GraphData>({
    queryKey: ['graph-neighborhood', nodeId, depth],
    queryFn: () => fetchNeighborhood(nodeId!, depth),
    enabled: !!nodeId,
    placeholderData: mockGraphData,
    retry: 1,
  });
}

export function useInitialGraphData() {
  return useQuery<GraphData>({
    queryKey: ['graph-initial'],
    queryFn: () => fetchNeighborhood('tier1', 2),
    placeholderData: mockGraphData,
    retry: 1,
  });
}
