// Default store for local dev and CI. Reads resolve from process.env
// (the same vars the app consumes today), so behavior with
// SHIPIT_SECRET_STORE=file is identical to before the store existed.
// Writes update the injected env for the CURRENT PROCESS only — durable
// local persistence stays what it is today (the operator's shell/.env).
// The PEM is never read through this store locally; it stays path-based
// via connectors.github.app.privateKeyPath.
import type { SecretsRegistry } from '@shipit-ai/shared';
import { assertWritable, type SecretStore } from './types.js';

export class FileSecretStore implements SecretStore {
  readonly kind = 'file' as const;

  constructor(
    private env: NodeJS.ProcessEnv = process.env,
    private registry: SecretsRegistry = {},
  ) {}

  async read(name: string): Promise<string | null> {
    const envVar = this.registry[name]?.env;
    if (!envVar) return null;
    const value = this.env[envVar];
    return value ? value : null;
  }

  async write(name: string, value: string): Promise<void> {
    assertWritable(name, this.registry);
    const envVar = this.registry[name]?.env;
    // If name has no env-var mapping (e.g. github-app-private-key, which the
    // manifest service writes only via gsm-kind stores), this is a deliberate
    // no-op: the value is not persisted and a subsequent read() returns null.
    if (envVar) this.env[envVar] = value;
  }
}
