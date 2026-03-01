'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphStats, type GraphStats } from '@/lib/api';
import { mockGraphStats } from '@/lib/mock-data';

export function useGraphStats() {
  return useQuery<GraphStats>({
    queryKey: ['graph-stats'],
    queryFn: fetchGraphStats,
    placeholderData: mockGraphStats,
    retry: 1,
    refetchInterval: 30_000,
  });
}
