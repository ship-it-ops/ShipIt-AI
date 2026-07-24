# Config-driven secrets registry — design

**Date:** 2026-07-01
**Status:** Approved (design), pending implementation plan
**Supersedes provenance:** the hard-coded maps in `packages/api-server/src/secrets/types.ts`
(`GSM_CONTAINER_DEFAULTS`, `ENV_VAR_FOR`, `WRITABLE_SECRETS`, `gsmContainerFor`).

## Problem

Secrets and env vars reach the application through **three inconsistent mechanisms**, so
there is no single place that says "here is every secret, where it comes from, and how it
is consumed." The inconsistency is what surfaced the feedback-widget confusion (the token
was invisible in `shipit.config.yaml` because it lived only in `types.ts` + a direct
`process.env` read).

| Mechanism                                                                    | Secrets using it                                                                            | Visible in config? |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| `${ENV}` substitution into config (loader.ts)                                | neo4j password, redis url, webhook secret, app id, app key path                             | yes                |
| Config stores env-var _name_; service reads `process.env[name]`              | session secret (`signingSecretEnv`), OIDC + GitHub OAuth client secrets (`clientSecretEnv`) | partial            |
| Hard-coded `ENV_VAR_FOR` in `types.ts`; service reads `process.env` directly | feedback token, auth admins, auth allowlist                                                 | no                 |

## Goal

One consistent, config-driven pattern: **every secret is declared in the config, the config
layer pulls it in (hydration), and the rest of the application consumes resolved values from
a typed accessor — no service reaching into `process.env` on its own.**

## Non-goals

- No change to GSM container names or env-var names (behavior-preserving; no Terraform change).
- No change to the file-store / local-dev developer experience.
- Not moving raw secret _values_ into the config object (explicitly rejected — see Approach 3).
- Plain non-secret env config (URIs, ports, `REDIS_URL`, `SHIPIT_API_URL`, feedback repo
  owner/name) stays `${ENV}` substitution. Those are not secrets.

## Decisions (from brainstorming)

- **Scope:** the whole secrets system, all at once, including bootstrap secrets.
- **Mechanism:** a central `secrets:` registry in config is the single source of truth
  (chosen over inline env-var-name references and over inline resolved values).
- **Consumption:** a typed `ResolvedSecrets` accessor for all first-party code, **and**
  `process.env` still populated for entries that declare an `env`, as a compatibility carrier
  for third-party libs (octokit, `@fastify/session`, the PEM file path). Lowest risk, no lib
  breakage.

## Architecture & data flow

```
committed shipit.config.yaml
  secrets:            <- SINGLE SOURCE OF TRUTH (non-secret metadata only)
    <key>: { gsmContainer, consume, env|filePathEnv, writable, required }
  feedback: { tokenSecret: github-feedback-token }   <- features reference by key
        |
        | 1. parse config structure (incl. secrets registry). Non-secret, so it
        |    is available before any secret value exists -> no bootstrap chicken-and-egg.
        v
  hydrateSecrets(config.secrets, store)      (store = GSM in prod, file in local)
        for each entry:
          value = store.read(key)
          consume === 'env'   -> process.env[env] = value ; resolved.set(key, value)
          consume === 'file'  -> write file ; process.env[filePathEnv] = path ; resolved.set(key, value)
          consume === 'store-only' -> owning store reads on demand (not hydrated to env)
        |
        | 2. ResolvedSecrets accessor
        v
  build ALL services from the accessor (incl. neo4j / session that need bootstrap secrets):
    FeedbackService(token = resolved.get(config.feedback.tokenSecret))
    session / oauth / etc. via resolved.require(secretRef)
    -> no first-party service reads process.env for secrets
```

**Boot order** (resolves bootstrap ordering): parse config -> `hydrateSecrets` -> build
`ResolvedSecrets` -> construct all services. In file-store/local mode `hydrateSecrets`
resolves each entry from `process.env[env]` (developer-exported) or the file store, so local
dev works with no GSM.

## Registry schema

`packages/shared/src/config/schema.ts`:

```ts
const secretEntrySchema = z.object({
  gsmContainer: z.string(), // prod GSM container name
  consume: z.enum(['env', 'file', 'store-only']).default('env'),
  env: z.string().optional(), // env var to populate (consume: 'env')
  filePathEnv: z.string().optional(), // path env var (consume: 'file', e.g. PEM)
  writable: z.boolean().default(false),
  required: z.boolean().default(false),
});
const secretsRegistrySchema = z.record(z.string(), secretEntrySchema);
```

Two things fall out for free:

- **Per-env override** keeps working with no new code:
  `gsmContainer: ${SHIPIT_GSM_SECRET_FEEDBACK:-shipit-github-feedback-token}` uses the
  existing `${}` substitution. The bespoke `SHIPIT_GSM_SECRET_<NAME>` logic + `gsmContainerFor()`
  in `types.ts` are deleted.
- **`writable`** replaces the `WRITABLE_SECRETS` set; `assertWritable()` reads the registry entry.

## Feature references (the consistency line)

Anything GSM-backed (in the registry) is consumed via a `*SecretRef` + the accessor. Plain
non-secret env config stays `${ENV}`.

| Today                                                           | Becomes                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `feedback` reads `process.env.FEEDBACK_GITHUB_TOKEN`            | `feedback.tokenSecret: github-feedback-token`                         |
| `auth.session.signingSecretEnv: SHIPIT_SESSION_SECRET`          | `auth.session.secretRef: session-secret`                              |
| `oidc.clientSecretEnv` / `github.clientSecretEnv`               | `…clientSecretRef: oidc-client-secret` / `github-oauth-client-secret` |
| `connectors.github.app.id: ${GITHUB_APP_ID}`                    | `connectors.github.app.idSecret: github-app-id`                       |
| `connectors.github.app.webhookSecret: ${GITHUB_WEBHOOK_SECRET}` | `…webhookSecretRef: github-webhook-secret`                            |
| `backend.neo4j.password: ${NEO4J_PASSWORD}`                     | `backend.neo4j.passwordSecret: neo4j-aura-password`                   |

## The accessor

Built by `hydrateSecrets`, passed into service construction (`index.ts`, `server.ts`):

```ts
interface ResolvedSecrets {
  get(key: LogicalSecret): string | null; // resolved value, or null if absent
  require(key: LogicalSecret): string; // throws SecretMissingError if absent
  has(key: LogicalSecret): boolean;
}
```

No bulk dump / `toJSON` — secret values never serialize.

## Full registry inventory (all 13 current LogicalSecrets)

| key                          | gsmContainer                      | consume    | env / path                  | writable | required |
| ---------------------------- | --------------------------------- | ---------- | --------------------------- | -------- | -------- |
| `neo4j-aura-password`        | shipit-neo4j-aura-password        | env        | NEO4J_PASSWORD              | no       | yes      |
| `session-secret`             | shipit-session-secret             | env        | SHIPIT_SESSION_SECRET       | no       | yes      |
| `github-app-private-key`     | shipit-github-app-private-key     | file       | GITHUB_APP_PRIVATE_KEY_PATH | yes      | no       |
| `github-app-id`              | shipit-github-app-id              | env        | GITHUB_APP_ID               | yes      | no       |
| `github-webhook-secret`      | shipit-github-webhook-secret      | env        | GITHUB_WEBHOOK_SECRET       | yes      | no       |
| `github-oauth-client-id`     | shipit-github-oauth-client-id     | env        | GITHUB_OAUTH_CLIENT_ID      | yes      | no       |
| `github-oauth-client-secret` | shipit-github-oauth-client-secret | env        | GITHUB_OAUTH_CLIENT_SECRET  | yes      | no       |
| `oidc-client-secret`         | shipit-oidc-client-secret         | env        | OIDC_CLIENT_SECRET          | yes      | no       |
| `auth-admin-emails`          | shipit-auth-admin-emails          | env        | SHIPIT_AUTH_ADMINS          | yes      | no       |
| `auth-allow-list-emails`     | shipit-auth-allow-list-emails     | env        | SHIPIT_AUTH_ALLOWLIST       | yes      | no       |
| `github-feedback-token`      | shipit-github-feedback-token      | env        | FEEDBACK_GITHUB_TOKEN       | no       | no       |
| `setup-completed`            | shipit-setup-completed            | store-only | —                           | yes      | no       |
| `connector-apps`             | shipit-connector-apps             | store-only | —                           | yes      | no       |

## Consumers to rewire (stop reading `process.env` for secrets)

- `server.ts` — session secret, OIDC client secret, GitHub OAuth client secret ->
  `resolved.require(secretRef)` (deletes 3 direct `process.env[...]` reads).
- `FeedbackService` / `index.ts` — token via `resolved.get(config.feedback.tokenSecret)`.
- `connectors.github.app` consumers — app id + webhook secret via refs.
- `backend.neo4j` — password via `passwordSecret`.
- auth admins / allowlist consumers — via accessor. (Detail: the config `admins`/`allowList`
  arrays merge with the GSM-hydrated CSV; keep the merge, source the CSV from the accessor.)
- `SettingsService` (allowlist editor) + setup wizard writes — `assertWritable` reads the
  registry.

## `types.ts` after

Keeps: the `LogicalSecret` union (type-safe key set), `SecretWriteForbiddenError`,
`SecretStore` interface, new `SecretMissingError`. Loses: `GSM_CONTAINER_DEFAULTS`,
`ENV_VAR_FOR`, `WRITABLE_SECRETS`, `gsmContainerFor()` — all derived from `config.secrets`.

## Validation

1. Every known `LogicalSecret` has a registry entry (Zod `.refine()`).
2. Every feature `*SecretRef` resolves to a declared registry key (Zod `.refine()`, caught at
   config-parse with a message naming the bad ref).
3. At boot in **gsm** mode, every `required: true` secret must resolve non-empty or the
   process fails fast; **file/local** mode warns instead.

## Error handling (behavior-preserving)

- Required secret missing (empty value): gsm -> fail fast naming key + container; local -> warn.
- Missing GSM _container_ (vs empty value): `store.read()` throws -> boot fails, as today
  (known scar). `required` governs empty values only.
- Undeclared `*SecretRef`: rejected at config-parse.
- Non-required absent: `resolved.get()` -> null; consumer decides (e.g. feedback shows the
  launcher and errors on submit).
- Write to non-writable secret: `SecretWriteForbiddenError`, unchanged.
- `require()` on absent: `SecretMissingError(key)`.

## Safety

The config object and `secrets:` registry hold only names/flags, never values, so logging or
serializing config stays safe. This is the reason the registry was chosen over inline resolved
values.

## Testing

- **Unit:** registry schema + refines (undeclared ref rejected; every `LogicalSecret` covered);
  `hydrateSecrets` across all three `consume` modes; required-missing (crash gsm / warn local);
  `ResolvedSecrets` get/require/has; `assertWritable` driven by registry.
- **Integration:** boot with a fake store covering all 13 entries -> every service constructs;
  required-missing fails fast in gsm mode. Existing `gsm-store.integration.test`, feedback, and
  auth suites stay green.
- **Cleanup:** rewrite `types.ts` tests that asserted `ENV_VAR_FOR` / `GSM_CONTAINER_DEFAULTS` /
  `WRITABLE_SECRETS` against the registry.

## Rollout

Behavior-preserving: same GSM containers, same env vars still populated, same writability. The
committed `shipit.config.yaml` gains a `secrets:` block pre-filled with today's values, so
nothing changes on-cluster except provenance. No Terraform change. Config + code only, so it
still needs a build+deploy at the same SHA to reach the cluster (no auto-deploy on merge).

## Related

- `docs/superpowers/specs/2026-06-09-gsm-secret-store-design.md` — the original GSM store.
- `docs/agent/decisions/feedback-widget-service-identity.md`
- `docs/agent/plans/integration-test-coverage-roadmap.md` (#5 GSM store + boot hydration)
