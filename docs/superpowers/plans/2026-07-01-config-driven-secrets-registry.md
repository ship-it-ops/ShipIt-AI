# Config-driven Secrets Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a single `secrets:` block in `shipit.config.yaml` the source of truth for every secret's provenance (GSM container → env var), driving boot hydration, and have all first-party code consume resolved values via a typed accessor instead of reading `process.env` directly.

**Architecture:** A committed, non-secret `secrets:` registry (logical key → `{gsmContainer, consume, env|filePathEnv, writable, required}`) is parsed in a pre-pass before full config load. `makeSecretStore` and `hydrateSecrets` are driven by that registry; hydration populates `process.env` (compat carrier for libs) and a `ResolvedSecrets` accessor. Feature config references secrets by key (`feedback.tokenSecret`, `auth.session.secretRef`, …); services take the accessor. The hard-coded maps in `secrets/types.ts` collapse to the `LogicalSecret` union plus errors.

**Tech Stack:** TypeScript (ESM, NodeNext), Zod v4, Fastify v5, Vitest v4, pnpm workspaces, `yaml`.

## Global Constraints

- Behavior-preserving: same GSM container names, same env-var names still populated, same writability. No Terraform change.
- Local/file-store dev must keep working with no GSM (developer-exported env or file store).
- Secret **values** never enter the config object; the `secrets:` registry holds names/flags only.
- Bootstrap ordering: the registry (non-secret) is available before any secret value; hydration runs before full `loadConfig()` so `${ENV}` substitutions still resolve.
- `LogicalSecret` union stays the type-safe key set; the registry must cover every member (enforced by a refine).
- ESM import paths end in `.js`. Follow existing file conventions (dash-delimited Redis keys, pino logging, no secret values logged).
- Run tests from `packages/api-server` (api-server suites) or `packages/shared` (schema/loader suites) with `npx vitest run <path>`.

---

## File Structure

- `packages/shared/src/config/schema.ts` — add `secretEntrySchema`, `secretsRegistrySchema`, `secrets` on `configSchema`, feature `*Secret`/`*SecretRef` fields, cross-ref refine. Export `LogicalSecret` mirror + `SecretEntry`/`SecretsRegistry` types.
- `packages/shared/src/config/loader.ts` — add `loadSecretsRegistry()` pre-parse helper.
- `packages/api-server/src/secrets/types.ts` — collapse maps; `assertWritable(name, registry)`; add `SecretMissingError`.
- `packages/api-server/src/secrets/resolved.ts` — NEW: `ResolvedSecrets` accessor.
- `packages/api-server/src/secrets/hydrate.ts` — rewrite as `hydrateSecrets(store, registry, env)`.
- `packages/api-server/src/secrets/gsm-store.ts` / `file-store.ts` — take the registry; resolve container/env from it.
- `packages/api-server/src/secrets/index.ts` — `makeSecretStore(registry, env)`; re-exports.
- `packages/api-server/src/index.ts` — boot wiring (two-phase).
- `packages/api-server/src/server.ts` — session/oauth via accessor.
- `packages/api-server/src/services/feedback-service.ts` + feedback wiring — token via accessor.
- `packages/api-server/src/auth-bootability.ts`, `services/settings-service.ts`, `services/setup-service.ts` — auth-emails via a live accessor view.

---

## Task 1: Registry schema + feature reference fields

**Files:**

- Modify: `packages/shared/src/config/schema.ts`
- Test: `packages/shared/src/config/__tests__/secrets-registry.test.ts` (Create)

**Interfaces:**

- Produces: `secretEntrySchema`, `secretsRegistrySchema`, `type SecretEntry`, `type SecretsRegistry`, `LOGICAL_SECRETS` (readonly tuple), and new feature fields: `feedback.tokenSecret`, `accessControl.auth.session.secretRef`, `accessControl.auth.providers.oidc.clientSecretRef`, `...github.clientSecretRef`, `connectors.github.app.idSecret` + `webhookSecretRef` + `privateKeySecret`, `backend.neo4j.passwordSecret`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/config/__tests__/secrets-registry.test.ts
import { describe, it, expect } from 'vitest';
import { secretsRegistrySchema, LOGICAL_SECRETS } from '../schema.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && npx vitest run src/config/__tests__/secrets-registry.test.ts`
Expected: FAIL — `secretsRegistrySchema`/`LOGICAL_SECRETS` not exported.

- [ ] **Step 3: Add the schema**

In `packages/shared/src/config/schema.ts`, near the top (after imports), add:

```ts
export const LOGICAL_SECRETS = [
  'neo4j-aura-password',
  'session-secret',
  'github-app-private-key',
  'github-app-id',
  'github-webhook-secret',
  'github-oauth-client-id',
  'github-oauth-client-secret',
  'oidc-client-secret',
  'auth-admin-emails',
  'auth-allow-list-emails',
  'github-feedback-token',
  'setup-completed',
  'connector-apps',
] as const;

const secretEntrySchema = z.object({
  gsmContainer: z.string().min(1),
  consume: z.enum(['env', 'file', 'store-only']).default('env'),
  env: z.string().optional(),
  filePathEnv: z.string().optional(),
  writable: z.boolean().default(false),
  required: z.boolean().default(false),
});

export const secretsRegistrySchema = z.record(z.string(), secretEntrySchema);
export type SecretEntry = z.infer<typeof secretEntrySchema>;
export type SecretsRegistry = z.infer<typeof secretsRegistrySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared && npx vitest run src/config/__tests__/secrets-registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `secrets` + feature ref fields to `configSchema`, with coverage + cross-ref refines**

Add `secrets: secretsRegistrySchema.default({...})` to the top-level `configSchema` object (default value populated in Task 3's config; for the schema default use the same 13 entries — see Task 3 for the canonical values, mirror them here so a config lacking a `secrets:` block still validates).

Add the reference fields (each optional string defaulting to the current logical key):

- `feedbackConfigSchema`: `tokenSecret: z.string().default('github-feedback-token')`.
- session schema: `secretRef: z.string().default('session-secret')` (keep `signingSecretEnv` for one release as deprecated-unused, or remove now — remove now per Global Constraints, updating its `.default`).
- oidc provider: `clientSecretRef: z.string().default('oidc-client-secret')`; github provider: `clientSecretRef: z.string().default('github-oauth-client-secret')`.
- `githubConnectorAppSchema` (global app): `idSecret: z.string().default('github-app-id')`, `webhookSecretRef: z.string().default('github-webhook-secret')`, `privateKeySecret: z.string().default('github-app-private-key')`.
- neo4j schema: `passwordSecret: z.string().default('neo4j-aura-password')`.

After the `configSchema` object, add a `.superRefine` that (a) asserts every `LOGICAL_SECRETS` member has a `secrets[key]` entry, and (b) asserts each feature ref points to an existing `secrets` key:

```ts
export const configSchema = baseConfigSchema.superRefine((cfg, ctx) => {
  for (const key of LOGICAL_SECRETS) {
    if (!cfg.secrets[key]) {
      ctx.addIssue({
        code: 'custom',
        path: ['secrets', key],
        message: `missing registry entry for known secret "${key}"`,
      });
    }
  }
  const refs: Array<[string[], string]> = [
    [['feedback', 'tokenSecret'], cfg.feedback.tokenSecret],
    [['accessControl', 'auth', 'session', 'secretRef'], cfg.accessControl.auth.session.secretRef],
    [['backend', 'neo4j', 'passwordSecret'], cfg.backend.neo4j.passwordSecret],
    [['connectors', 'github', 'app', 'idSecret'], cfg.connectors.github.app.idSecret],
    [
      ['connectors', 'github', 'app', 'webhookSecretRef'],
      cfg.connectors.github.app.webhookSecretRef,
    ],
    [
      ['connectors', 'github', 'app', 'privateKeySecret'],
      cfg.connectors.github.app.privateKeySecret,
    ],
    [
      ['accessControl', 'auth', 'providers', 'oidc', 'clientSecretRef'],
      cfg.accessControl.auth.providers.oidc.clientSecretRef,
    ],
    [
      ['accessControl', 'auth', 'providers', 'github', 'clientSecretRef'],
      cfg.accessControl.auth.providers.github.clientSecretRef,
    ],
  ];
  for (const [path, ref] of refs) {
    if (ref && !cfg.secrets[ref]) {
      ctx.addIssue({ code: 'custom', path, message: `references unknown secret "${ref}"` });
    }
  }
});
```

(Rename the current `z.object({...})` for the config to `baseConfigSchema` so the refine wraps it. `type Config = z.infer<typeof configSchema>` still works.)

- [ ] **Step 6: Add refine tests**

Append to the test file:

```ts
import { configSchema } from '../schema.js';
import validBase from './fixtures/valid-config.js'; // a minimal object that parses

it('rejects a feature ref to an undeclared secret', () => {
  const bad = { ...validBase, feedback: { ...validBase.feedback, tokenSecret: 'nope' } };
  const res = configSchema.safeParse(bad);
  expect(res.success).toBe(false);
  expect(JSON.stringify(res).includes('references unknown secret "nope"')).toBe(true);
});
```

Build `fixtures/valid-config.ts` from the committed `shipit.config.yaml` shape (defaults fill the rest). If a fixture is heavy, instead parse the real file via the loader in an integration test and keep this unit test focused on the registry subtree only.

- [ ] **Step 7: Run all shared config tests**

Run: `cd packages/shared && npx vitest run src/config`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/config/schema.ts packages/shared/src/config/__tests__/secrets-registry.test.ts
git commit -m "feat(config): add secrets registry schema + feature secret-ref fields"
```

---

## Task 2: `loadSecretsRegistry()` pre-parse helper

**Files:**

- Modify: `packages/shared/src/config/loader.ts`
- Test: `packages/shared/src/config/__tests__/load-secrets-registry.test.ts` (Create)

**Interfaces:**

- Consumes: `secretsRegistrySchema` (Task 1), existing `readYaml`, `deepMerge`, `substituteEnv`, `findConfigPaths`.
- Produces: `loadSecretsRegistry(options?: LoadConfigOptions): SecretsRegistry` — reads base+local YAML, `deepMerge`s, substitutes env on the `secrets:` subtree only, validates with `secretsRegistrySchema`. Used at boot **before** `loadConfig()` because secret values aren't needed to read the registry (it uses only operator env / `${...:-default}`).

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/config/__tests__/load-secrets-registry.test.ts
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSecretsRegistry } from '../loader.js';

describe('loadSecretsRegistry', () => {
  it('reads only the secrets block, resolving ${...:-default}', () => {
    const dir = mkdtempSync(join(tmpdir(), 'reg-'));
    const base = join(dir, 'shipit.config.yaml');
    writeFileSync(
      base,
      [
        'secrets:',
        '  github-feedback-token:',
        '    gsmContainer: ${SHIPIT_GSM_SECRET_FEEDBACK:-shipit-github-feedback-token}',
        '    env: FEEDBACK_GITHUB_TOKEN',
      ].join('\n'),
    );
    const reg = loadSecretsRegistry({ basePath: base, env: {} });
    expect(reg['github-feedback-token'].gsmContainer).toBe('shipit-github-feedback-token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && npx vitest run src/config/__tests__/load-secrets-registry.test.ts`
Expected: FAIL — `loadSecretsRegistry` not exported.

- [ ] **Step 3: Implement**

Add to `packages/shared/src/config/loader.ts`:

```ts
import { secretsRegistrySchema, type SecretsRegistry } from './schema.js';

export function loadSecretsRegistry(options: LoadConfigOptions = {}): SecretsRegistry {
  const env = options.env ?? process.env;
  let basePath = options.basePath;
  let localPath = options.localPath;
  if (!basePath) {
    const found = findConfigPaths();
    basePath = found.basePath;
    if (!localPath) localPath = found.localPath;
  }
  const base = readYaml(basePath) as Record<string, unknown>;
  const local =
    localPath && existsSync(localPath)
      ? (readYaml(localPath) as Record<string, unknown>)
      : undefined;
  const merged = local ? (deepMerge(base, local) as Record<string, unknown>) : base;
  const substituted = substituteEnv(merged.secrets ?? {}, env, ['secrets']);
  const result = secretsRegistrySchema.safeParse(substituted);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Secrets registry validation failed for ${basePath}:\n${issues}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared && npx vitest run src/config/__tests__/load-secrets-registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/config/loader.ts packages/shared/src/config/__tests__/load-secrets-registry.test.ts
git commit -m "feat(config): loadSecretsRegistry pre-parse helper"
```

---

## Task 3: Populate committed `shipit.config.yaml`

**Files:**

- Modify: `shipit.config.yaml`
- Test: `packages/shared/src/config/__tests__/committed-config.test.ts` (Create) — loads the real file and asserts it validates.

**Interfaces:**

- Consumes: schema (Task 1), loader.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/config/__tests__/committed-config.test.ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadConfig } from '../loader.js';

const ENV = {
  NEO4J_URI: 'bolt://x',
  NEO4J_USER: 'u',
  NEO4J_PASSWORD: 'p',
  REDIS_URL: 'redis://x',
  SHIPIT_API_URL: 'http://x',
  SHIPIT_WEB_ORIGIN: 'http://x',
};

describe('committed shipit.config.yaml', () => {
  it('validates with the secrets registry present', () => {
    const cfg = loadConfig({ basePath: join(process.cwd(), '../../shipit.config.yaml'), env: ENV });
    expect(Object.keys(cfg.secrets).length).toBe(13);
    expect(cfg.feedback.tokenSecret).toBe('github-feedback-token');
    expect(cfg.secrets['session-secret'].required).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/shared && npx vitest run src/config/__tests__/committed-config.test.ts`
Expected: FAIL — no `secrets:` block yet / refine rejects missing entries.

- [ ] **Step 3: Add the `secrets:` block** to `shipit.config.yaml` (top-level, after `backend:`), copying these exact entries:

```yaml
# Single source of truth for every secret's provenance. Non-secret metadata
# only (container names + which env var carries the value); safe to commit.
# Boot hydration reads this to pull values from GSM (prod) into process.env +
# a typed accessor. Override a container per-env with
# ${SHIPIT_GSM_SECRET_<NAME>:-default}. See
# docs/superpowers/specs/2026-07-01-config-driven-secrets-registry-design.md.
secrets:
  neo4j-aura-password:
    { gsmContainer: shipit-neo4j-aura-password, env: NEO4J_PASSWORD, required: true }
  session-secret:
    { gsmContainer: shipit-session-secret, env: SHIPIT_SESSION_SECRET, required: true }
  github-app-private-key:
    {
      gsmContainer: shipit-github-app-private-key,
      consume: file,
      filePathEnv: GITHUB_APP_PRIVATE_KEY_PATH,
      writable: true,
    }
  github-app-id: { gsmContainer: shipit-github-app-id, env: GITHUB_APP_ID, writable: true }
  github-webhook-secret:
    { gsmContainer: shipit-github-webhook-secret, env: GITHUB_WEBHOOK_SECRET, writable: true }
  github-oauth-client-id:
    { gsmContainer: shipit-github-oauth-client-id, env: GITHUB_OAUTH_CLIENT_ID, writable: true }
  github-oauth-client-secret:
    {
      gsmContainer: shipit-github-oauth-client-secret,
      env: GITHUB_OAUTH_CLIENT_SECRET,
      writable: true,
    }
  oidc-client-secret:
    { gsmContainer: shipit-oidc-client-secret, env: OIDC_CLIENT_SECRET, writable: true }
  auth-admin-emails:
    { gsmContainer: shipit-auth-admin-emails, env: SHIPIT_AUTH_ADMINS, writable: true }
  auth-allow-list-emails:
    { gsmContainer: shipit-auth-allow-list-emails, env: SHIPIT_AUTH_ALLOWLIST, writable: true }
  github-feedback-token: { gsmContainer: shipit-github-feedback-token, env: FEEDBACK_GITHUB_TOKEN }
  setup-completed: { gsmContainer: shipit-setup-completed, consume: store-only, writable: true }
  connector-apps: { gsmContainer: shipit-connector-apps, consume: store-only, writable: true }
```

- [ ] **Step 4: Convert feature sections to refs.** In `shipit.config.yaml`:
  - `feedback:` add `tokenSecret: github-feedback-token`.
  - `backend.neo4j:` add `passwordSecret: neo4j-aura-password` (keep `password: ${NEO4J_PASSWORD}` — it still resolves from the hydrated env; the service will switch to the accessor in Task 10, at which point `password` can be dropped. Keep both this task to stay green).
  - `connectors.github.app:` add `idSecret: github-app-id`, `webhookSecretRef: github-webhook-secret`, `privateKeySecret: github-app-private-key`.
  - `accessControl.auth.session:` add `secretRef: session-secret`.
  - `oidc` / `github` providers: add `clientSecretRef`.

- [ ] **Step 5: Run to verify it passes**

Run: `cd packages/shared && npx vitest run src/config/__tests__/committed-config.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shipit.config.yaml packages/shared/src/config/__tests__/committed-config.test.ts
git commit -m "feat(config): populate secrets registry + feature refs in committed config"
```

---

## Task 4: `ResolvedSecrets` accessor + `SecretMissingError`

**Files:**

- Create: `packages/api-server/src/secrets/resolved.ts`
- Modify: `packages/api-server/src/secrets/types.ts` (add `SecretMissingError`)
- Test: `packages/api-server/src/__tests__/secrets/resolved.test.ts` (Create)

**Interfaces:**

- Produces: `class ResolvedSecrets { get(key): string | null; require(key): string; has(key): boolean }`, constructed from a `Map<string,string>` and an optional live env view. `class SecretMissingError extends Error`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-server/src/__tests__/secrets/resolved.test.ts
import { describe, it, expect } from 'vitest';
import { ResolvedSecrets } from '../../secrets/resolved.js';
import { SecretMissingError } from '../../secrets/types.js';

describe('ResolvedSecrets', () => {
  it('get/require/has over a snapshot', () => {
    const r = new ResolvedSecrets(new Map([['github-feedback-token', 'tok']]));
    expect(r.get('github-feedback-token')).toBe('tok');
    expect(r.has('github-feedback-token')).toBe(true);
    expect(r.require('github-feedback-token')).toBe('tok');
    expect(r.get('session-secret')).toBeNull();
    expect(() => r.require('session-secret')).toThrow(SecretMissingError);
  });

  it('live env view reflects post-boot writes (auth-emails)', () => {
    const env: NodeJS.ProcessEnv = {};
    const r = new ResolvedSecrets(
      new Map(),
      { 'auth-allow-list-emails': 'SHIPIT_AUTH_ALLOWLIST' },
      env,
    );
    expect(r.get('auth-allow-list-emails')).toBeNull();
    env.SHIPIT_AUTH_ALLOWLIST = 'a@b.c';
    expect(r.get('auth-allow-list-emails')).toBe('a@b.c'); // reads live
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/resolved.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Add to `packages/api-server/src/secrets/types.ts`:

```ts
export class SecretMissingError extends Error {
  constructor(name: string) {
    super(`Required secret "${name}" is not available.`);
    this.name = 'SecretMissingError';
  }
}
```

Create `packages/api-server/src/secrets/resolved.ts`:

```ts
import { SecretMissingError } from './types.js';

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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/resolved.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-server/src/secrets/resolved.ts packages/api-server/src/secrets/types.ts packages/api-server/src/__tests__/secrets/resolved.test.ts
git commit -m "feat(secrets): ResolvedSecrets accessor + SecretMissingError"
```

---

## Task 5: Collapse `types.ts` maps; stores take the registry

**Files:**

- Modify: `packages/api-server/src/secrets/types.ts`, `gsm-store.ts`, `file-store.ts`, `index.ts`
- Test: `packages/api-server/src/__tests__/secrets/writable.test.ts` (Create); update `gsm-store`/`file-store` tests.

**Interfaces:**

- Produces: `assertWritable(name: string, registry: SecretsRegistry)`; `gsmContainerFor(name, registry, env)`; `GsmSecretStore({projectId, env, registry})`; `FileSecretStore(env, registry)`; `makeSecretStore(registry, env)`. Removes `GSM_CONTAINER_DEFAULTS`, `ENV_VAR_FOR`, `WRITABLE_SECRETS`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-server/src/__tests__/secrets/writable.test.ts
import { describe, it, expect } from 'vitest';
import { assertWritable, SecretWriteForbiddenError } from '../../secrets/types.js';
import type { SecretsRegistry } from '@ship-it/shared';

const REG: SecretsRegistry = {
  'setup-completed': { gsmContainer: 'c', consume: 'store-only', writable: true, required: false },
  'github-feedback-token': {
    gsmContainer: 'c2',
    consume: 'env',
    env: 'FEEDBACK_GITHUB_TOKEN',
    writable: false,
    required: false,
  },
} as SecretsRegistry;

describe('assertWritable(registry)', () => {
  it('allows writable, forbids read-only', () => {
    expect(() => assertWritable('setup-completed', REG)).not.toThrow();
    expect(() => assertWritable('github-feedback-token', REG)).toThrow(SecretWriteForbiddenError);
  });
});
```

(Use the real `@ship-it/shared` package import path used elsewhere in api-server for the `SecretsRegistry` type — confirm the workspace alias with `grep "@ship-it" packages/api-server/src/*.ts`.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/writable.test.ts`
Expected: FAIL — `assertWritable` signature mismatch.

- [ ] **Step 3: Rewrite `types.ts`.** Remove `GSM_CONTAINER_DEFAULTS`, `ENV_VAR_FOR`, `WRITABLE_SECRETS`, and the old `assertWritable`/`gsmContainerFor`. Keep `LogicalSecret`, `SecretStore`, `SecretWriteForbiddenError`, `SecretMissingError`. Add:

```ts
import type { SecretsRegistry } from '@ship-it/shared';

export function gsmContainerFor(name: string, registry: SecretsRegistry): string {
  const entry = registry[name];
  if (!entry) throw new Error(`Unknown secret "${name}" — not in the secrets registry.`);
  return entry.gsmContainer;
}

export function assertWritable(name: string, registry: SecretsRegistry): void {
  if (!registry[name]?.writable) throw new SecretWriteForbiddenError(name);
}
```

Keep `LogicalSecret` as the union (unchanged) for call-site type-safety.

- [ ] **Step 4: Thread the registry into the stores.**
  - `GsmSecretStore`: constructor takes `{ projectId, env, registry }`; `containerFor(name)` → `gsmContainerFor(name, this.registry)`; `write` → `assertWritable(name, this.registry)`.
  - `FileSecretStore`: constructor `(env, registry)`; replace `ENV_VAR_FOR[name]` reads/writes with `registry[name]?.env`; `write` → `assertWritable(name, this.registry)`.
  - `makeSecretStore(registry, env)`: pass `registry` to both constructors.
  - `secrets/index.ts`: update re-exports (drop the removed maps; keep `assertWritable`, `gsmContainerFor`, `SecretMissingError`, `ResolvedSecrets`, `hydrateSecrets`).

- [ ] **Step 5: Update existing store tests** (`gsm-store`/`file-store` suites) to construct with a small registry fixture and drop assertions against the removed maps.

- [ ] **Step 6: Run the secrets suites**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api-server/src/secrets packages/api-server/src/__tests__/secrets
git commit -m "refactor(secrets): registry-driven types; stores take the registry"
```

---

## Task 6: Rewrite hydration as `hydrateSecrets(store, registry, env)`

**Files:**

- Modify: `packages/api-server/src/secrets/hydrate.ts`
- Test: `packages/api-server/src/__tests__/secrets/hydrate.test.ts` (update/replace)

**Interfaces:**

- Consumes: `SecretStore`, `SecretsRegistry`, `ResolvedSecrets`.
- Produces: `hydrateSecrets(store, registry, env?): Promise<{ resolved: ResolvedSecrets; hydrated: string[]; pemPath: string | null }>`. For each registry entry: read from store; `consume:'env'` → set `env[entry.env]` if empty + snapshot; `consume:'file'` → materialize file + set `entry.filePathEnv` + snapshot; `consume:'store-only'` → skip env, skip snapshot. Build `ResolvedSecrets(snapshot, liveEnvByKey, env)` where `liveEnvByKey` maps the auth-emails keys to their env var. In `file`-kind stores, still populate the snapshot from `env[entry.env]` so local dev resolves.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-server/src/__tests__/secrets/hydrate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { hydrateSecrets } from '../../secrets/hydrate.js';
import type { SecretStore } from '../../secrets/types.js';
import type { SecretsRegistry } from '@ship-it/shared';

const REG = {
  'github-feedback-token': {
    gsmContainer: 'c',
    consume: 'env',
    env: 'FEEDBACK_GITHUB_TOKEN',
    writable: false,
    required: false,
  },
  'setup-completed': { gsmContainer: 'c2', consume: 'store-only', writable: true, required: false },
} as unknown as SecretsRegistry;

function store(values: Record<string, string | null>): SecretStore {
  return {
    kind: 'gsm',
    read: vi.fn(async (n: string) => values[n] ?? null),
    write: vi.fn(),
  } as unknown as SecretStore;
}

describe('hydrateSecrets', () => {
  it('sets env + snapshot for consume:env, skips store-only', async () => {
    const env: NodeJS.ProcessEnv = {};
    const { resolved, hydrated } = await hydrateSecrets(
      store({ 'github-feedback-token': 'tok', 'setup-completed': '1' }),
      REG,
      env,
    );
    expect(env.FEEDBACK_GITHUB_TOKEN).toBe('tok');
    expect(resolved.get('github-feedback-token')).toBe('tok');
    expect(resolved.get('setup-completed')).toBeNull(); // store-only not snapshotted
    expect(hydrated).toContain('github-feedback-token');
  });

  it('does not clobber a pre-set env var', async () => {
    const env: NodeJS.ProcessEnv = { FEEDBACK_GITHUB_TOKEN: 'preset' };
    await hydrateSecrets(store({ 'github-feedback-token': 'fromgsm' }), REG, env);
    expect(env.FEEDBACK_GITHUB_TOKEN).toBe('preset');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/hydrate.test.ts`
Expected: FAIL — `hydrateSecrets` not exported.

- [ ] **Step 3: Implement** `hydrateSecrets` (replacing `hydrateFromStore`). Preserve the PEM materialization block (name uses `GITHUB_APP_ID`), the no-clobber falsy check, and the file-rewrite-every-boot behavior. Iterate registry entries in a deterministic order (ensure `github-app-id` before the PEM). Define `LIVE_ENV_KEYS = { 'auth-admin-emails': 'SHIPIT_AUTH_ADMINS', 'auth-allow-list-emails': 'SHIPIT_AUTH_ALLOWLIST' }` and pass to `ResolvedSecrets`. For `file`-kind stores, read the value; if the store returns null, fall back to `env[entry.env]` for the snapshot so local-exported secrets resolve via the accessor.

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/hydrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-server/src/secrets/hydrate.ts packages/api-server/src/__tests__/secrets/hydrate.test.ts
git commit -m "refactor(secrets): registry-driven hydrateSecrets with ResolvedSecrets"
```

---

## Task 7: Boot wiring (two-phase load)

**Files:**

- Modify: `packages/api-server/src/index.ts`
- Test: covered by Task 12 integration boot test; add a focused unit if practical.

**Interfaces:**

- Consumes: `loadSecretsRegistry`, `makeSecretStore`, `hydrateSecrets`, `loadConfig`.
- Produces: an in-scope `resolved: ResolvedSecrets` passed to `createServer` and service constructors.

- [ ] **Step 1: Replace the boot prelude.** Current (index.ts ~82-83):

```ts
const secretStore = makeSecretStore();
const hydration = await hydrateFromStore(secretStore);
```

becomes:

```ts
// Phase 1: read the non-secret registry (no secret values needed).
const registry = loadSecretsRegistry();
// Phase 2: build the store from the registry and hydrate — MUST precede
// loadConfig() so ${ENV} substitutions resolve from the populated env.
const secretStore = makeSecretStore(registry);
const hydration = await hydrateSecrets(secretStore, registry);
const resolved = hydration.resolved;
```

Keep the existing "Hydrated N secret(s)" log using `hydration.hydrated`. Then `loadConfig()` runs as today. Pass `resolved` into `createServer({ ..., resolved })` and into `new FeedbackService({ ..., resolved, tokenSecret: config.feedback.tokenSecret })` (Task 9) and `Neo4jService` (Task 10).

- [ ] **Step 2: Typecheck**

Run: `cd packages/api-server && npx tsc --noEmit`
Expected: exit 0 (after Tasks 8–10 land; expect transient errors until then — do this task on a branch alongside 8–10 or accept a red typecheck until Task 10 completes, then a single green checkpoint).

- [ ] **Step 3: Commit**

```bash
git add packages/api-server/src/index.ts
git commit -m "refactor(boot): two-phase registry load + hydrateSecrets wiring"
```

---

## Task 8: Rewire `server.ts` session + OAuth to the accessor

**Files:**

- Modify: `packages/api-server/src/server.ts`
- Test: existing auth/server suites; add assertions where present.

**Interfaces:**

- Consumes: `resolved: ResolvedSecrets` on `createServer` opts; `config.accessControl.auth.session.secretRef`, `...oidc.clientSecretRef`, `...github.clientSecretRef`.

- [ ] **Step 1: Add `resolved` to `CreateServerOptions`** and thread from `createServer`.

- [ ] **Step 2: Replace the three `process.env` reads.** Current:

```ts
const sessionSecret = process.env[opts.config!.accessControl.auth.session.signingSecretEnv]!;
// ...
const oidcSecret = process.env[oidcCfg.clientSecretEnv];
if (!oidcSecret)
  throw new AuthConfigError(`OIDC clientSecretEnv "${oidcCfg.clientSecretEnv}" is not set.`);
// ...
const ghSecret = process.env[ghCfg.clientSecretEnv];
if (!ghSecret)
  throw new AuthConfigError(`GitHub clientSecretEnv "${ghCfg.clientSecretEnv}" is not set.`);
```

becomes:

```ts
const sessionSecret = opts.resolved.require(opts.config!.accessControl.auth.session.secretRef);
// ...
const oidcSecret = opts.resolved.get(oidcCfg.clientSecretRef);
if (!oidcSecret)
  throw new AuthConfigError(`OIDC secret "${oidcCfg.clientSecretRef}" is not available.`);
// ...
const ghSecret = opts.resolved.get(ghCfg.clientSecretRef);
if (!ghSecret)
  throw new AuthConfigError(`GitHub secret "${ghCfg.clientSecretRef}" is not available.`);
```

- [ ] **Step 3: Run auth/server suites**

Run: `cd packages/api-server && npx vitest run src/__tests__ -t auth`
Expected: PASS (update any test that stubbed `process.env[...]` to instead pass a `ResolvedSecrets` with the key).

- [ ] **Step 4: Commit**

```bash
git add packages/api-server/src/server.ts packages/api-server/src/__tests__
git commit -m "refactor(auth): resolve session + oauth secrets via accessor"
```

---

## Task 9: Rewire feedback to the accessor

**Files:**

- Modify: `packages/api-server/src/services/feedback-service.ts`, `packages/api-server/src/index.ts`
- Test: update `feedback-service.test.ts` / `routes/feedback.test.ts`.

**Interfaces:**

- Consumes: `resolved: ResolvedSecrets`, `config.feedback.tokenSecret`.
- Produces: `FeedbackService` reads its token from `resolved.get(tokenSecret)` instead of `env.FEEDBACK_GITHUB_TOKEN`.

- [ ] **Step 1: Update `FeedbackServiceOptions`** — replace `env` with `resolved: ResolvedSecrets` and `tokenSecret: string`. Change `token()`:

```ts
private token(): string | undefined {
  const t = this.resolved.get(this.tokenSecret);
  return t && t.trim() ? t.trim() : undefined;
}
```

`isConfigured()` / `isEnabled()` / `createReport` (from the earlier change) are unchanged.

- [ ] **Step 2: Update wiring in `index.ts`:**

```ts
const feedbackService = new FeedbackService({
  feedback: config.feedback,
  tokenSecret: config.feedback.tokenSecret,
  resolved,
  redis: runStoreRedis,
});
```

- [ ] **Step 3: Update tests** — construct with a `ResolvedSecrets` snapshot instead of `env: { FEEDBACK_GITHUB_TOKEN }`. E.g. `resolved: new ResolvedSecrets(new Map([['github-feedback-token','tok']]))`, `tokenSecret: 'github-feedback-token'`. Keep the existing `isConfigured`/`isEnabled`/503-on-submit cases.

- [ ] **Step 4: Run feedback suites**

Run: `cd packages/api-server && npx vitest run src/__tests__/services/feedback-service.test.ts src/__tests__/routes/feedback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-server/src/services/feedback-service.ts packages/api-server/src/index.ts packages/api-server/src/__tests__
git commit -m "refactor(feedback): resolve issue-filing token via accessor"
```

---

## Task 10: Rewire connectors app + neo4j

**Files:**

- Modify: `packages/api-server/src/index.ts` (neo4j), connectors credential resolution (`schema.ts resolveAppCredentials` consumers / `routes/connectors.ts`), `shipit.config.yaml` (drop now-unused `${ENV}` for the converted secrets).
- Test: existing connector/neo4j suites.

**Interfaces:**

- Consumes: `resolved`, `config.backend.neo4j.passwordSecret`, `config.connectors.github.app.{idSecret,webhookSecretRef,privateKeySecret}`.

- [ ] **Step 1: neo4j.** In `index.ts`:

```ts
const neo4jService = new Neo4jService(
  neo4j.uri,
  neo4j.user,
  resolved.require(config.backend.neo4j.passwordSecret),
);
```

Then remove `password: ${NEO4J_PASSWORD}` from `shipit.config.yaml` (schema: make `password` optional/removed; the ref is now the source). Keep `NEO4J_PASSWORD` in the registry so hydration still sets the env (the neo4j driver env is not otherwise needed, but the compat carrier is harmless).

- [ ] **Step 2: connectors app id / webhook secret / PEM.** Where `resolveAppCredentials` reads `global.id` / webhook secret from config, source them from `resolved.get(app.idSecret)` / `resolved.get(app.webhookSecretRef)`; the PEM path continues to come from `GITHUB_APP_PRIVATE_KEY_PATH` (set by hydration for `privateKeySecret`). Remove the corresponding `${GITHUB_APP_ID}` / `${GITHUB_WEBHOOK_SECRET}` from `connectors.github.app` in the YAML.

- [ ] **Step 3: Run connector + neo4j suites**

Run: `cd packages/api-server && npx vitest run src/__tests__ -t "connector|neo4j"`
Expected: PASS (update stubs to pass `resolved`).

- [ ] **Step 4: Full typecheck (green checkpoint for Tasks 7–10)**

Run: `cd packages/api-server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/api-server/src shipit.config.yaml
git commit -m "refactor(connectors,neo4j): source GSM-backed secrets via accessor"
```

---

## Task 11: Rewire auth-emails (live view)

**Files:**

- Modify: `packages/api-server/src/auth-bootability.ts`, `services/settings-service.ts`, `services/setup-service.ts`
- Test: existing auth-bootability / settings / setup suites.

**Interfaces:**

- Consumes: `resolved` with live-view keys `auth-admin-emails` / `auth-allow-list-emails`.

- [ ] **Step 1: `auth-bootability.ts`.** `assertAuthConfigBootable` currently reads `env.SHIPIT_AUTH_ADMINS` / `env.SHIPIT_AUTH_ALLOWLIST`. Change its signature to also accept `resolved: ResolvedSecrets` and read `resolved.get('auth-admin-emails')` / `resolved.get('auth-allow-list-emails')` (live view = same env under the hood, so behavior is identical). Update the caller in `server.ts` (`assertAuthConfigBootable(opts.config, opts.resolved)`).

- [ ] **Step 2: settings/setup services.** These WRITE `this.env.SHIPIT_AUTH_ADMINS/ALLOWLIST` after persisting to GSM. Leave the write-through as-is (the live-view accessor reflects it). Optionally add a comment pointing to `ResolvedSecrets` live-view so the coupling is discoverable. No behavior change.

- [ ] **Step 3: Run auth suites**

Run: `cd packages/api-server && npx vitest run src/__tests__ -t "bootab|settings|setup"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api-server/src
git commit -m "refactor(auth-emails): read admins/allowlist via live accessor view"
```

---

## Task 12: Integration boot test + cleanup

**Files:**

- Create: `packages/api-server/src/__tests__/secrets/boot-hydration.integration.test.ts`
- Modify: remove/rewrite any lingering `types.ts` map tests.

**Interfaces:**

- Consumes: full pipeline (`loadSecretsRegistry` → fake store → `hydrateSecrets` → `loadConfig`).

- [ ] **Step 1: Write the integration test**

```ts
// boots the full secret pipeline against a fake gsm store covering all 13 keys
import { describe, it, expect, vi } from 'vitest';
import { hydrateSecrets } from '../../secrets/hydrate.js';
import { loadSecretsRegistry } from '@ship-it/shared';
import { join } from 'node:path';

const ALL = {
  'neo4j-aura-password': 'p',
  'session-secret': 's',
  'github-app-private-key': '-----BEGIN-----',
  'github-app-id': '123',
  'github-webhook-secret': 'w',
  'github-oauth-client-id': 'ci',
  'github-oauth-client-secret': 'cs',
  'oidc-client-secret': 'os',
  'auth-admin-emails': 'a@b.c',
  'auth-allow-list-emails': 'a@b.c',
  'github-feedback-token': 'tok',
  'setup-completed': '1',
  'connector-apps': '{}',
};

it('hydrates every registry entry and fails fast on a missing required secret', async () => {
  const registry = loadSecretsRegistry({
    basePath: join(process.cwd(), '../../shipit.config.yaml'),
    env: {},
  });
  const env: NodeJS.ProcessEnv = { SHIPIT_GITHUB_APP_KEY_DIR: '/tmp/shipit-test-keys' };
  const store = {
    kind: 'gsm' as const,
    read: vi.fn(async (n: string) => (ALL as any)[n] ?? null),
    write: vi.fn(),
  };
  const { resolved } = await hydrateSecrets(store as any, registry, env);
  expect(resolved.require('session-secret')).toBe('s');
  expect(env.FEEDBACK_GITHUB_TOKEN).toBe('tok');
  expect(env.GITHUB_APP_PRIVATE_KEY_PATH).toContain('github-app-123.pem');
});
```

Add a second case: drop `session-secret` from the fake store and assert boot fails fast (implement the `required` check in `hydrateSecrets` if not already: after the loop, for each `entry.required` with no resolved value in a `gsm`-kind store, throw a clear error).

- [ ] **Step 2: Run to verify it passes**

Run: `cd packages/api-server && npx vitest run src/__tests__/secrets/boot-hydration.integration.test.ts`
Expected: PASS.

- [ ] **Step 3: Full suite green**

Run: `cd packages/api-server && npx vitest run && cd ../shared && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Grep for stragglers**

Run: `grep -rn "ENV_VAR_FOR\|GSM_CONTAINER_DEFAULTS\|WRITABLE_SECRETS\|hydrateFromStore\|signingSecretEnv\|clientSecretEnv" packages/*/src --include="*.ts" | grep -v "\.test\."`
Expected: no results (all replaced).

- [ ] **Step 5: Commit**

```bash
git add packages/api-server/src/__tests__
git commit -m "test(secrets): boot-hydration integration + registry-driven cleanup"
```

---

## Self-Review

**Spec coverage:** registry schema (T1), pre-parse load (T2), committed config (T3), accessor+error (T4), types collapse + stores (T5), hydration rewrite (T6), boot wiring (T7), server/auth (T8), feedback (T9), connectors/neo4j (T10), auth-emails live view (T11), validation + fail-fast + integration (T1 refine, T6/T12). Error handling (fail-fast gsm / warn local), safety (no values in config), rollout — covered.

**Open detail for the implementer:** confirm the workspace import alias for shared (`@ship-it/shared` vs `@ship-it-ai/shared`) via `grep "from '@ship" packages/api-server/src/index.ts` before writing imports; use whatever the repo already uses. Confirm `resolveAppCredentials`'s exact call sites in `routes/connectors.ts` before Task 10 Step 2.

**Type consistency:** `ResolvedSecrets.get/require/has(key: string)`; `assertWritable(name, registry)`; `gsmContainerFor(name, registry)`; `hydrateSecrets(store, registry, env?) → {resolved, hydrated, pemPath}`; `makeSecretStore(registry, env?)` — consistent across tasks.

**Local-dev fail-fast nuance:** the `required` fail-fast fires only for `store.kind === 'gsm'`; file/local logs a warning (Task 6 implementation + Task 12 second case guards on kind).
