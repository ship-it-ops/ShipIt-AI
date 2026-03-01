import { describe, it, expect, beforeEach } from 'vitest';
import type { CanonicalNode } from '@shipit-ai/shared';
import { IdentityReconciler } from '../identity/reconciler.js';
import { InMemoryLinkingKeyIndex } from '../identity/linking-key-index.js';

function makeNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'shipit://repository/default/payments-api',
    label: 'Repository',
    properties: { name: 'payments-api' },
    _claims: [],
    _source_system: 'github',
    _source_org: 'github/acme-corp',
    _source_id: 'github://acme-corp/payments-api',
    _last_synced: '2026-02-28T10:00:00Z',
    _event_version: 1,
    ...overrides,
  };
}

describe('IdentityReconciler', () => {
  let index: InMemoryLinkingKeyIndex;
  let reconciler: IdentityReconciler;

  beforeEach(() => {
    index = new InMemoryLinkingKeyIndex();
    reconciler = new IdentityReconciler(index);
  });

  it('creates a new entity when no match exists', async () => {
    const node = makeNode();
    const result = await reconciler.reconcile(node);

    expect(result.action).toBe('create');
    expect(result.canonicalId).toBe(node.id);
  });

  it('registers linking key on create', async () => {
    const node = makeNode();
    await reconciler.reconcile(node);

    const lookupResult = await index.lookupByLinkingKey(node._source_id);
    expect(lookupResult).toBe(node.id);
  });

  it('merges via primary key match', async () => {
    const node = makeNode();
    // Pre-register the canonical ID
    await index.register(node.id, node._source_id);

    const result = await reconciler.reconcile(node);
    expect(result.action).toBe('merge');
    expect(result.matchMethod).toBe('primary_key');
    expect(result.canonicalId).toBe(node.id);
  });

  it('merges via linking key match', async () => {
    const existingId = 'shipit://repository/default/payments-api';
    const linkingKey = 'github://acme-corp/payments-api';
    await index.register(existingId, linkingKey);

    // New node with same linking key but different canonical ID
    const node = makeNode({
      id: 'shipit://repository/default/payments-api-new',
      _source_id: linkingKey,
    });

    const result = await reconciler.reconcile(node);
    expect(result.action).toBe('merge');
    expect(result.matchMethod).toBe('linking_key');
    expect(result.canonicalId).toBe(existingId);
  });

  it('creates separate entities for different linking keys', async () => {
    const node1 = makeNode({
      id: 'shipit://repository/default/repo-a',
      _source_id: 'github://org/repo-a',
    });
    const node2 = makeNode({
      id: 'shipit://repository/default/repo-b',
      _source_id: 'github://org/repo-b',
    });

    const result1 = await reconciler.reconcile(node1);
    const result2 = await reconciler.reconcile(node2);

    expect(result1.action).toBe('create');
    expect(result2.action).toBe('create');
    expect(result1.canonicalId).not.toBe(result2.canonicalId);
  });
});
