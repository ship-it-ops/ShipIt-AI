'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConnectors, triggerSync, type ConnectorInfo } from '@/lib/api';
import { mockConnectors } from '@/lib/mock-data';

export function useConnectors() {
  return useQuery<ConnectorInfo[]>({
    queryKey: ['connectors'],
    queryFn: fetchConnectors,
    placeholderData: mockConnectors,
    retry: 1,
    refetchInterval: 30_000,
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      queryClient.invalidateQueries({ queryKey: ['graph-stats'] });
    },
  });
}
