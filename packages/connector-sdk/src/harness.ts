import type { CanonicalEntity, EventBusClient } from '@shipit-ai/shared';
import type { ShipItConnector, ConnectorConfig, SyncResult } from './interface.js';
import { SyncState, SyncStateMachine } from './sync-state.js';

export interface HarnessOptions {
  batchSize?: number;
}

export class ConnectorHarness {
  private readonly connector: ShipItConnector;
  private readonly eventBus: EventBusClient;
  private readonly config: ConnectorConfig;
  private readonly stateMachine = new SyncStateMachine();
  private readonly batchSize: number;

  constructor(
    connector: ShipItConnector,
    eventBus: EventBusClient,
    config: ConnectorConfig,
    options?: HarnessOptions,
  ) {
    this.connector = connector;
    this.eventBus = eventBus;
    this.config = config;
    this.batchSize = options?.batchSize ?? 100;
  }

  get syncState(): SyncState {
    return this.stateMachine.state;
  }

  async runSync(mode: 'full' | 'incremental'): Promise<SyncResult> {
    const startTime = Date.now();
    let entitiesSynced = 0;
    const errors: string[] = [];

    try {
      this.stateMachine.transition(SyncState.SYNCING);

      const auth = await this.connector.authenticate(this.config);
      if (!auth.success) {
        this.stateMachine.transition(SyncState.FAILED);
        return {
          status: 'failed',
          entities_synced: 0,
          errors: [auth.error ?? 'Authentication failed'],
          duration_ms: Date.now() - startTime,
        };
      }

      const discovery = await this.connector.discover();

      for (const entityType of discovery.entity_types) {
        try {
          let cursor: string | undefined;
          let hasMore = true;

          while (hasMore) {
            const fetchResult = await this.connector.fetch(entityType, cursor);

            if (fetchResult.entities.length > 0) {
              const normalized = this.connector.normalize(fetchResult.entities);
              await this.publish(normalized);
              entitiesSynced += normalized.nodes.length;
            }

            cursor = fetchResult.cursor;
            hasMore = fetchResult.has_more;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Error syncing ${entityType}: ${message}`);
        }
      }

      this.stateMachine.transition(SyncState.COMPLETING);

      if (errors.length > 0 && entitiesSynced > 0) {
        this.stateMachine.transition(SyncState.DEGRADED);
        return {
          status: 'partial',
          entities_synced: entitiesSynced,
          errors,
          duration_ms: Date.now() - startTime,
        };
      }

      if (errors.length > 0 && entitiesSynced === 0) {
        this.stateMachine.transition(SyncState.FAILED);
        return {
          status: 'failed',
          entities_synced: 0,
          errors,
          duration_ms: Date.now() - startTime,
        };
      }

      this.stateMachine.transition(SyncState.IDLE);
      return {
        status: 'success',
        entities_synced: entitiesSynced,
        errors: [],
        duration_ms: Date.now() - startTime,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (this.stateMachine.canTransitionTo(SyncState.FAILED)) {
        this.stateMachine.transition(SyncState.FAILED);
      }

      return {
        status: 'failed',
        entities_synced: entitiesSynced,
        errors: [message, ...errors],
        duration_ms: Date.now() - startTime,
      };
    }
  }

  private async publish(entities: CanonicalEntity): Promise<void> {
    await this.eventBus.publish([entities], this.config.id);
  }
}
