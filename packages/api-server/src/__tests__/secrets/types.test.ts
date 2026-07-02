import { describe, it, expect } from 'vitest';
import { SecretWriteForbiddenError, assertWritable, gsmContainerFor } from '../../secrets/types.js';
import type { SecretsRegistry } from '@shipit-ai/shared';

// Minimal registry fixture covering the cases the types tests need.
const REG: SecretsRegistry = {
  'github-app-private-key': {
    gsmContainer: 'shipit-github-app-private-key',
    consume: 'file',
    filePathEnv: 'GITHUB_APP_PRIVATE_KEY_PATH',
    writable: true,
    required: false,
  },
  'github-webhook-secret': {
    gsmContainer: 'shipit-github-webhook-secret',
    consume: 'env',
    env: 'GITHUB_WEBHOOK_SECRET',
    writable: true,
    required: false,
  },
  'neo4j-aura-password': {
    gsmContainer: 'shipit-neo4j-aura-password',
    consume: 'env',
    env: 'NEO4J_PASSWORD',
    writable: false,
    required: true,
  },
  'session-secret': {
    gsmContainer: 'shipit-session-secret',
    consume: 'env',
    env: 'SHIPIT_SESSION_SECRET',
    writable: false,
    required: true,
  },
  'github-app-id': {
    gsmContainer: 'shipit-github-app-id',
    consume: 'env',
    env: 'GITHUB_APP_ID',
    writable: true,
    required: false,
  },
  'oidc-client-secret': {
    gsmContainer: 'shipit-oidc-client-secret',
    consume: 'env',
    env: 'OIDC_CLIENT_SECRET',
    writable: true,
    required: false,
  },
  'auth-admin-emails': {
    gsmContainer: 'shipit-auth-admin-emails',
    consume: 'env',
    env: 'SHIPIT_AUTH_ADMINS',
    writable: true,
    required: false,
  },
  'setup-completed': {
    gsmContainer: 'shipit-setup-completed',
    consume: 'store-only',
    writable: true,
    required: false,
  },
  'auth-allow-list-emails': {
    gsmContainer: 'shipit-auth-allow-list-emails',
    consume: 'env',
    env: 'SHIPIT_AUTH_ALLOWLIST',
    writable: true,
    required: false,
  },
  'connector-apps': {
    gsmContainer: 'shipit-connector-apps',
    consume: 'store-only',
    writable: true,
    required: false,
  },
  'github-feedback-token': {
    gsmContainer: 'shipit-github-feedback-token',
    consume: 'env',
    env: 'FEEDBACK_GITHUB_TOKEN',
    writable: false,
    required: false,
  },
} as SecretsRegistry;

describe('secret taxonomy', () => {
  it('refuses writes to read-only secrets, allows writable ones', () => {
    expect(() => assertWritable('neo4j-aura-password', REG)).toThrow(SecretWriteForbiddenError);
    expect(() => assertWritable('session-secret', REG)).toThrow(SecretWriteForbiddenError);
    expect(() => assertWritable('github-app-private-key', REG)).not.toThrow();
    expect(() => assertWritable('github-app-id', REG)).not.toThrow();
    expect(() => assertWritable('oidc-client-secret', REG)).not.toThrow();
    expect(() => assertWritable('auth-admin-emails', REG)).not.toThrow();
    expect(() => assertWritable('setup-completed', REG)).not.toThrow();
    expect(() => assertWritable('auth-allow-list-emails', REG)).not.toThrow();
    expect(() => assertWritable('connector-apps', REG)).not.toThrow();
    expect(() => assertWritable('github-feedback-token', REG)).toThrow(SecretWriteForbiddenError);
  });

  it('resolves container names from the registry with per-secret env override', () => {
    expect(gsmContainerFor('github-app-private-key', REG, {} as NodeJS.ProcessEnv)).toBe(
      'shipit-github-app-private-key',
    );
    expect(
      gsmContainerFor('github-app-private-key', REG, {
        SHIPIT_GSM_SECRET_GITHUB_APP_PRIVATE_KEY: 'custom-name',
      } as NodeJS.ProcessEnv),
    ).toBe('custom-name');
    expect(
      gsmContainerFor('github-app-private-key', REG, {
        SHIPIT_GSM_SECRET_GITHUB_APP_PRIVATE_KEY: '   ',
      } as NodeJS.ProcessEnv),
    ).toBe('shipit-github-app-private-key');
  });

  it('gsmContainerFor throws for unknown registry keys', () => {
    expect(() => gsmContainerFor('not-a-secret', REG, {} as NodeJS.ProcessEnv)).toThrow(
      /Unknown secret/,
    );
  });

  it('writable flag is driven by the registry (not a hard-coded set)', () => {
    // Override writability through the registry — proves the registry wins.
    const overrideReg: SecretsRegistry = {
      'setup-completed': {
        gsmContainer: 'shipit-setup-completed',
        consume: 'store-only',
        writable: false, // flipped: now forbidden
        required: false,
      },
    } as SecretsRegistry;
    expect(() => assertWritable('setup-completed', overrideReg)).toThrow(SecretWriteForbiddenError);
  });
});
