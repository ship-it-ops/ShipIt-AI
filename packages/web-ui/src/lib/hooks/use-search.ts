'use client';

import { useQuery } from '@tanstack/react-query';
import { searchEntities, type SearchResult } from '@/lib/api';
import { mockSearchResults } from '@/lib/mock-data';

export function useSearch(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: () => searchEntities(query),
    enabled: query.length >= 2,
    placeholderData: query.length >= 2
      ? mockSearchResults.filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase())
        )
      : [],
    retry: 1,
  });
}
