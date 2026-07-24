import { SecretMissingError } from './types.js';

// Read-only face of the accessor — what most consumers should depend on.
export type SecretsReader = Pick<ResolvedSecrets, 'get'>;

// Values resolved at boot from the secret store, plus an optional "live view"
// for secrets whose env var is mutated at runtime (auth-emails via the admin
// Settings editor). Live-view keys read process.env on each call so post-boot
// writes are visible; all other keys come from the boot snapshot.
export class ResolvedSecrets {
  constructor(
    private readonly snapshot: Map<string, string>,
    private readonly liveEnvByKey: Record<string, string> = {},
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  get(key: string): string | null {
    const liveVar = this.liveEnvByKey[key];
    if (liveVar) {
      const v = this.env[liveVar];
      return v && v.length > 0 ? v : null;
    }
    return this.snapshot.has(key) ? this.snapshot.get(key)! : null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  require(key: string): string {
    const v = this.get(key);
    if (v === null) throw new SecretMissingError(key);
    return v;
  }
}
