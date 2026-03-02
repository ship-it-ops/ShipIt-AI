'use client';

import { useQuery } from '@tanstack/react-query';
import { searchEntities, type SearchResult } from '@/lib/api';

export function useSearch(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: () => searchEntities(query),
    enabled: query.length >= 2,
    retry: 1,
  });
}
