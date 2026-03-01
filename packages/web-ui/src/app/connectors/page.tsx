'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectorCard } from '@/components/connectors/connector-card';
import { ConnectorDetail } from '@/components/connectors/connector-detail';
import { AddConnectorDialog } from '@/components/connectors/add-connector-dialog';
import { useConnectors, useTriggerSync } from '@/lib/hooks/use-connectors';

export default function ConnectorHubPage() {
  const { data: connectors = [] } = useConnectors();
  const syncMutation = useTriggerSync();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const selectedConnector = connectors.find((c) => c.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connector Hub</h1>
          <p className="text-sm text-muted-foreground">
            Manage your data source integrations
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Connector
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            onClick={() => setSelectedId(connector.id)}
          />
        ))}
      </div>

      {selectedConnector && (
        <ConnectorDetail
          connector={selectedConnector}
          onClose={() => setSelectedId(null)}
          onSync={() => syncMutation.mutate(selectedConnector.id)}
        />
      )}

      <AddConnectorDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
