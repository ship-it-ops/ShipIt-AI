/**
 * Boot-hydration integration test (registry rework Task 12).
 *
 * Drives the FULL boot secret pipeline against a fake gsm-kind store:
 * loadSecretsRegistry (the real committed shipit.config.yaml) →
 * hydrateSecrets → ResolvedSecrets. Unlike hydrate.test.ts (unit, hand-built
 * registries) and hydrate.integration.test.ts (real GCP, skipped by
 * default), this proves the committed registry itself hydrates end-to-end:
 * every env-consumed entry lands in env + the accessor, the PEM
 * materializes under the app-id filename, store-only keys stay out of env,
 * and a missing required secret fails the boot fast in gsm mode.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findConfigPaths, loadSecretsRegistry } from '@shipit-ai/shared';
import { hydrateSecrets } from '../../secrets/hydrate.js';
import type { SecretStore } from '../../secrets/types.js';

const PEM = '-----BEGIN RSA PRIVATE KEY-----\nline1\n-----END RSA PRIVATE KEY-----\n';

// One value per logical secret in the committed registry — the full boot set.
const ALL: Record<string, string> = {
  'neo4j-aura-password': 'neo4j-pw',
  'session-secret': 's'.repeat(48),
  'github-app-private-key': PEM,
  'github-app-id': '123',
  'github-webhook-secret': 'wh-secret',
  'github-oauth-client-id': 'oauth-id',
  'github-oauth-client-secret': 'oauth-secret',
  'oidc-client-secret': 'oidc-secret',
  'auth-admin-emails': 'admin@example.com',
  'auth-allow-list-emails': 'a@example.com,b@example.com',
  'github-feedback-token': 'ghp_feedback',
  'setup-completed': 'true',
  'connector-apps': '{}',
};

function fakeGsmStore(values: Record<string, string>): SecretStore {
  return {
    kind: 'gsm',
    read: vi.fn(async (name: string) => values[name] ?? null),
    write: vi.fn(async () => {}),
  } as unknown as SecretStore;
}

describe('boot hydration against the committed registry', () => {
  let keyDir: string;
  let env: NodeJS.ProcessEnv;
  // The COMMITTED registry only: findConfigPaths locates the repo-root yaml
  // from any cwd; empty env keeps ${SHIPIT_GSM_SECRET_*} operator overrides
  // and any local-yaml overlay out of the assertion surface.
  const registry = loadSecretsRegistry({
    basePath: findConfigPaths().basePath,
    localPath: '/nonexistent/shipit.config.local.yaml',
    env: {},
  });

  beforeEach(() => {
    keyDir = mkdtempSync(join(tmpdir(), 'boot-hydration-'));
    env = { SHIPIT_GITHUB_APP_KEY_DIR: keyDir };
  });
  afterEach(() => {
    rmSync(keyDir, { recursive: true, force: true });
  });

  it('declares every logical secret exactly once', () => {
    expect(Object.keys(registry).sort()).toEqual(Object.keys(ALL).sort());
  });

  it('hydrates every entry: env populated, accessor resolves, PEM materialized', async () => {
    const store = fakeGsmStore(ALL);
    const { resolved, hydrated, pemPath } = await hydrateSecrets(store, registry, env);

    // env-consumed entries land in process env under the registry's carrier.
    expect(env.NEO4J_PASSWORD).toBe('neo4j-pw');
    expect(env.SHIPIT_SESSION_SECRET).toBe(ALL['session-secret']);
    expect(env.GITHUB_APP_ID).toBe('123');
    expect(env.GITHUB_WEBHOOK_SECRET).toBe('wh-secret');
    expect(env.FEEDBACK_GITHUB_TOKEN).toBe('ghp_feedback');
    expect(env.SHIPIT_AUTH_ADMINS).toBe('admin@example.com');

    // ...and are visible through the accessor (snapshot or live view).
    expect(resolved.require('session-secret')).toBe(ALL['session-secret']);
    expect(resolved.require('neo4j-aura-password')).toBe('neo4j-pw');
    expect(resolved.get('github-webhook-secret')).toBe('wh-secret');
    expect(resolved.get('github-feedback-token')).toBe('ghp_feedback');
    expect(resolved.get('auth-allow-list-emails')).toBe('a@example.com,b@example.com');

    // The PEM materializes with exact bytes under the app-id filename and
    // its path env points at it.
    expect(pemPath).toBe(join(keyDir, 'github-app-123.pem'));
    expect(env.GITHUB_APP_PRIVATE_KEY_PATH).toBe(pemPath);
    expect(readFileSync(pemPath!, 'utf-8')).toBe(PEM);

    // store-only entries never touch env or the accessor snapshot.
    expect(resolved.has('setup-completed')).toBe(false);
    expect(resolved.has('connector-apps')).toBe(false);
    expect(hydrated).not.toContain('setup-completed');
    expect(hydrated).not.toContain('connector-apps');
  });

  it('fails fast in gsm mode when a required secret is missing', async () => {
    const values = { ...ALL };
    delete values['session-secret'];
    const store = fakeGsmStore(values);
    await expect(hydrateSecrets(store, registry, env)).rejects.toThrow(
      /session-secret.*shipit-session-secret/s,
    );
  });

  it('does not fail fast in file mode when a required secret is missing', async () => {
    const store = {
      kind: 'file',
      read: vi.fn(async () => null),
      write: vi.fn(async () => {}),
    } as unknown as SecretStore;
    const { resolved } = await hydrateSecrets(store, registry, env);
    expect(resolved.get('session-secret')).toBeNull();
  });
});
