// Logical secret taxonomy for the SecretStore abstraction. The registry
// (SecretsRegistry from @shipit-ai/shared) is the single source of truth for
// GSM container names, env-var mappings, writability, and consumption mode.
// All maps that used to live here have moved into the registry — see the
// default in packages/shared/src/config/schema.ts.
import type { SecretsRegistry } from '@shipit-ai/shared';

export type LogicalSecret =
  | 'github-app-private-key'
  | 'github-webhook-secret'
  | 'github-oauth-client-secret'
  | 'oidc-client-secret'
  | 'github-app-id'
  | 'github-oauth-client-id'
  | 'auth-admin-emails'
  | 'auth-allow-list-emails'
  | 'setup-completed'
  // Durable home for runtime-created connectors that don't live in the
  // committed config: a single JSON blob of {connectorId → {instance, pem,
  // webhookSecret}}. Written wholesale on connector mutations and rehydrated
  // (instances + PEM files) at boot. See ConnectorAppStore.
  | 'connector-apps'
  // Server-held fine-grained PAT (issues:write) used to file issues from the
  // in-app "Report a problem" widget. Read-only at runtime (never app-written),
  // consumed via FEEDBACK_GITHUB_TOKEN.
  | 'github-feedback-token'
  | 'neo4j-aura-password'
  | 'session-secret';

export class SecretMissingError extends Error {
  constructor(name: string) {
    super(`Required secret "${name}" is not available.`);
    this.name = 'SecretMissingError';
  }
}

export class SecretWriteForbiddenError extends Error {
  constructor(name: string) {
    super(
      `Refusing to write read-only secret "${name}" — this secret is operator-managed ` +
        `(see scripts/bootstrap-secrets.md in the infra repo).`,
    );
    this.name = 'SecretWriteForbiddenError';
  }
}

// SHIPIT_GSM_SECRET_GITHUB_APP_PRIVATE_KEY etc. — per-secret emergency override.
// Checked before the registry entry so an operator can reroute a secret in a
// live cluster without waiting for a config change.
export function gsmContainerFor(
  name: string,
  registry: SecretsRegistry,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env[`SHIPIT_GSM_SECRET_${name.toUpperCase().replace(/-/g, '_')}`];
  if (override && override.trim()) return override.trim();
  const entry = registry[name];
  if (!entry) throw new Error(`Unknown secret "${name}" — not in the secrets registry.`);
  return entry.gsmContainer;
}

export function assertWritable(name: string, registry: SecretsRegistry): void {
  if (!(name in registry))
    throw new Error(`Unknown secret "${name}" — not in the secrets registry.`);
  if (!registry[name]?.writable) throw new SecretWriteForbiddenError(name);
}

export interface SecretStore {
  // 'file' keeps today's local behavior; 'gsm' is the GKE deployment.
  readonly kind: 'file' | 'gsm';
  // null = no value exists yet (first run) — never an error.
  read(name: string): Promise<string | null>;
  // Throws SecretWriteForbiddenError for read-only secrets.
  // Callers must pass a non-empty value; writing an empty string is undefined behavior.
  write(name: string, value: string): Promise<void>;
}
