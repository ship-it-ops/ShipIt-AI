import type { CanonicalEntity } from '@shipit-ai/shared';

export interface ConnectorConfig {
  id: string;
  type: string;
  credentials: Record<string, string>;
  scope: Record<string, unknown>;
  schedule?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  expires_at?: string;
}

export interface DiscoveryResult {
  entity_types: string[];
  total_entities: Record<string, number>;
}

export interface FetchResult {
  entities: unknown[];
  cursor?: string;
  has_more: boolean;
}

export interface SyncResult {
  status: 'success' | 'partial' | 'failed';
  entities_synced: number;
  errors: string[];
  duration_ms: number;
}

export interface WebhookEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface ConnectorManifest {
  name: string;
  version: string;
  schema_version: string;
  min_sdk_version: string;
  supported_entity_types: string[];
}

export interface ShipItConnector {
  readonly manifest: ConnectorManifest;
  authenticate(config: ConnectorConfig): Promise<AuthResult>;
  discover(): Promise<DiscoveryResult>;
  fetch(entityType: string, cursor?: string): Promise<FetchResult>;
  normalize(raw: unknown[]): CanonicalEntity;
  sync(mode: 'full' | 'incremental'): Promise<SyncResult>;
  handleWebhook?(event: WebhookEvent): Promise<void>;
}
