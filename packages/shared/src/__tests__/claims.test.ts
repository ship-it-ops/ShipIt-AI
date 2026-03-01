import { describe, it, expect } from 'vitest';
import type {
  PropertyClaim,
  ResolutionStrategy,
  EdgeClaim,
  ClaimResolutionResult,
  CanonicalNode,
  CanonicalEdge,
  CanonicalEntity,
} from '../index.js';

describe('Type contracts', () => {
  it('PropertyClaim interface is structurally valid', () => {
    const claim: PropertyClaim = {
      property_key: 'tier',
      value: 1,
      source: 'backstage',
      source_id: 'backstage://default/component/payments-api',
      ingested_at: '2026-02-28T10:00:00Z',
      confidence: 0.95,
      evidence: 'parsed from catalog-info.yaml',
    };
    expect(claim.property_key).toBe('tier');
    expect(claim.confidence).toBe(0.95);
  });

  it('ResolutionStrategy accepts all valid values', () => {
    const strategies: ResolutionStrategy[] = [
      'MANUAL_OVERRIDE_FIRST',
      'HIGHEST_CONFIDENCE',
      'AUTHORITATIVE_ORDER',
      'LATEST_TIMESTAMP',
      'MERGE_SET',
    ];
    expect(strategies).toHaveLength(5);
  });

  it('EdgeClaim supports retraction', () => {
    const claim: EdgeClaim = {
      source: 'github',
      confidence: 0.9,
      ingested_at: '2026-02-28T10:00:00Z',
      retracted: true,
      retracted_at: '2026-02-28T12:00:00Z',
    };
    expect(claim.retracted).toBe(true);
    expect(claim.retracted_at).toBeDefined();
  });

  it('ClaimResolutionResult contains winning claim', () => {
    const winningClaim: PropertyClaim = {
      property_key: 'owner',
      value: 'platform-team',
      source: 'backstage',
      source_id: 'backstage://default/component/api',
      ingested_at: '2026-02-28T10:00:00Z',
      confidence: 0.95,
      evidence: null,
    };
    const result: ClaimResolutionResult = {
      effective_value: 'platform-team',
      winning_claim: winningClaim,
      strategy: 'HIGHEST_CONFIDENCE',
      all_claims: [winningClaim],
    };
    expect(result.effective_value).toBe('platform-team');
    expect(result.strategy).toBe('HIGHEST_CONFIDENCE');
  });

  it('CanonicalEntity contains nodes and edges', () => {
    const node: CanonicalNode = {
      id: 'shipit://logical-service/default/payments-api',
      label: 'LogicalService',
      properties: { name: 'payments-api' },
      _claims: [],
      _source_system: 'backstage',
      _source_org: 'backstage/default',
      _source_id: 'backstage://default/component/payments-api',
      _last_synced: '2026-02-28T10:00:00Z',
      _event_version: 1,
    };
    const edge: CanonicalEdge = {
      type: 'IMPLEMENTED_BY',
      from: 'shipit://logical-service/default/payments-api',
      to: 'shipit://repository/default/payments-api',
      _source: 'backstage',
      _confidence: 0.95,
      _ingested_at: '2026-02-28T10:00:00Z',
    };
    const entity: CanonicalEntity = {
      nodes: [node],
      edges: [edge],
    };
    expect(entity.nodes).toHaveLength(1);
    expect(entity.edges).toHaveLength(1);
    expect(entity.nodes[0].label).toBe('LogicalService');
  });
});
