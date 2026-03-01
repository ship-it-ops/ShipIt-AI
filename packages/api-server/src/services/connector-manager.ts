export interface ConnectorConfig {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export type SyncState = 'idle' | 'running' | 'completed' | 'failed';

export interface SyncStatus {
  connectorId: string;
  state: SyncState;
  lastSyncAt?: string;
  error?: string;
}

export class ConnectorManager {
  private connectors = new Map<string, ConnectorConfig>();
  private syncStatuses = new Map<string, SyncStatus>();

  addConnector(config: ConnectorConfig): ConnectorConfig {
    if (this.connectors.has(config.id)) {
      throw Object.assign(new Error(`Connector '${config.id}' already exists`), {
        statusCode: 409,
      });
    }
    this.connectors.set(config.id, config);
    this.syncStatuses.set(config.id, { connectorId: config.id, state: 'idle' });
    return config;
  }

  getConnectors(): ConnectorConfig[] {
    return Array.from(this.connectors.values());
  }

  getConnector(id: string): ConnectorConfig {
    const connector = this.connectors.get(id);
    if (!connector) {
      throw Object.assign(new Error(`Connector '${id}' not found`), { statusCode: 404 });
    }
    return connector;
  }

  removeConnector(id: string): void {
    if (!this.connectors.has(id)) {
      throw Object.assign(new Error(`Connector '${id}' not found`), { statusCode: 404 });
    }
    this.connectors.delete(id);
    this.syncStatuses.delete(id);
  }

  triggerSync(id: string, _mode: 'full' | 'incremental' = 'full'): SyncStatus {
    this.getConnector(id); // Throws if not found
    const status: SyncStatus = {
      connectorId: id,
      state: 'running',
      lastSyncAt: new Date().toISOString(),
    };
    this.syncStatuses.set(id, status);

    // Phase 1: simulate sync completion after a short delay
    setTimeout(() => {
      const current = this.syncStatuses.get(id);
      if (current?.state === 'running') {
        this.syncStatuses.set(id, { ...current, state: 'completed' });
      }
    }, 1000);

    return status;
  }

  getSyncStatus(id: string): SyncStatus {
    this.getConnector(id); // Throws if not found
    return this.syncStatuses.get(id) ?? { connectorId: id, state: 'idle' };
  }
}
