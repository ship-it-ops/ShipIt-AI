'use client';

import { X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ConnectorInfo } from '@/lib/api';

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  healthy: 'success',
  degraded: 'warning',
  failed: 'destructive',
  not_connected: 'secondary',
};

interface ConnectorDetailProps {
  connector: ConnectorInfo;
  onClose: () => void;
  onSync: () => void;
}

export function ConnectorDetail({ connector, onClose, onSync }: ConnectorDetailProps) {
  const variant = statusBadgeVariant[connector.status] || 'secondary';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l bg-background shadow-lg">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">{connector.name}</h3>
        <button onClick={onClose} className="rounded-sm p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Badge variant={variant}>
            {connector.status.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-muted-foreground">{connector.entityCount} entities</span>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Type</div>
          <div className="text-sm capitalize">{connector.type}</div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Last Sync</div>
          <div className="text-sm">
            {connector.lastSync
              ? new Date(connector.lastSync).toLocaleString()
              : 'Never'}
          </div>
        </div>

        {connector.nextSync && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Next Sync</div>
            <div className="text-sm">{new Date(connector.nextSync).toLocaleString()}</div>
          </div>
        )}

        <Separator />

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Sync History</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <span>Full sync</span>
              <span className="text-xs text-muted-foreground">
                {connector.lastSync
                  ? new Date(connector.lastSync).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <Button
          onClick={onSync}
          className="w-full gap-2"
          disabled={connector.status === 'not_connected'}
        >
          <RefreshCw className="h-4 w-4" />
          Re-sync Now
        </Button>
      </div>
    </div>
  );
}
