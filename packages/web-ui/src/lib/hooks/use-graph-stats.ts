'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphStats, type GraphStats } from '@/lib/api';

export function useGraphStats() {
  return useQuery<GraphStats>({
    queryKey: ['graph-stats'],
    queryFn: fetchGraphStats,
    retry: 1,
    refetchInterval: 30_000,
  });
}
