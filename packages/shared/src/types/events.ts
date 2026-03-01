import type { CanonicalEntity } from './canonical.js';

export interface EventEnvelope {
  id: string; // UUID
  timestamp: string; // ISO 8601
  connector_id: string;
  idempotency_key: string; // {connector_id}:{entity_primary_key}:{event_version}
  payload: CanonicalEntity;
}

export interface EventHandler {
  (event: EventEnvelope): Promise<void>;
}

export interface EventBusClient {
  publish(events: CanonicalEntity[], connectorId: string): Promise<void>;
  subscribe(handler: EventHandler): Promise<void>;
  replay(fromTimestamp: string): Promise<void>;
  close(): Promise<void>;
}
