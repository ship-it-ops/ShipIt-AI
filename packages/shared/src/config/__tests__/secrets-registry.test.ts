import { describe, it, expect } from 'vitest';
import { secretsRegistrySchema, LOGICAL_SECRETS } from '../schema.js';
import { configSchema } from '../schema.js';

describe('secretsRegistrySchema', () => {
  it('parses a valid entry with defaults', () => {
    const r = secretsRegistrySchema.parse({
      'github-feedback-token': {
        gsmContainer: 'shipit-github-feedback-token',
        env: 'FEEDBACK_GITHUB_TOKEN',
      },
    });
    expect(r['github-feedback-token']).toEqual({
      gsmContainer: 'shipit-github-feedback-token',
      consume: 'env',
      env: 'FEEDBACK_GITHUB_TOKEN',
      writable: false,
      required: false,
    });
  });

  it('accepts file and store-only consume modes', () => {
    const r = secretsRegistrySchema.parse({
      pem: { gsmContainer: 'c', consume: 'file', filePathEnv: 'P' },
      latch: { gsmContainer: 'c2', consume: 'store-only', writable: true },
    });
    expect(r.pem.consume).toBe('file');
    expect(r.latch.consume).toBe('store-only');
  });

  it('exposes the full LogicalSecret key set', () => {
    expect(LOGICAL_SECRETS).toContain('github-feedback-token');
    expect(LOGICAL_SECRETS).toContain('session-secret');
    expect(LOGICAL_SECRETS.length).toBe(13);
  });
});

// Minimal base config mirroring access-control-schema.test.ts — only the
// required backend/frontend fields; everything else fills in via defaults.
const baseConfig = {
  backend: {
    neo4j: { uri: 'bolt://localhost:7687', user: 'neo4j', password: 'pw' },
    redis: { url: 'redis://localhost:6379' },
    api: { port: 3001 },
    schema: { path: './shipit-schema.yaml' },
    cypherQuery: { timeoutMs: 5000, rowLimit: 1000 },
    reconciliation: { threshold: 0.85 },
    mcp: {
      apiKeySecret: null,
      rateLimits: { graphQueryPerDay: 100, rowLimit: 1000, hopLimit: 6, queryTimeoutMs: 10000 },
    },
  },
  frontend: {
    api: { url: 'http://localhost:3001' },
    integrations: {
      pagerduty: { subdomain: null },
      datadog: { site: null },
      github: { org: null },
      slack: { workspace: null, channelPrefix: 'team-' },
      kubernetes: { consoleUrlTemplate: null },
    },
  },
};

describe('configSchema superRefine', () => {
  it('parses a minimal config with all secrets defaults', () => {
    const cfg = configSchema.parse(baseConfig);
    expect(cfg.secrets).toBeDefined();
    expect(Object.keys(cfg.secrets).length).toBe(13);
  });

  it('rejects a feature ref to an undeclared secret', () => {
    const bad = { ...baseConfig, feedback: { tokenSecret: 'nope' } };
    const res = configSchema.safeParse(bad);
    expect(res.success).toBe(false);
    // Brief used JSON.stringify(...).includes(...) but JSON escapes inner " as \"
    // making the substring search fail. Check issues array directly instead.
    expect(res.error?.issues.some((i) => i.message === 'references unknown secret "nope"')).toBe(
      true,
    );
  });
});
