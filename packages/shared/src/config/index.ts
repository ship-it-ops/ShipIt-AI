export { loadConfig, deepMerge, loadSecretsRegistry } from './loader.js';
export type { LoadConfigOptions } from './loader.js';
export { findConfigPaths } from './find-root.js';
export type { ConfigPaths } from './find-root.js';
export {
  configSchema,
  connectorInstanceSchema,
  resolveAppCredentials,
  LOGICAL_SECRETS,
  secretsRegistrySchema,
} from './schema.js';
export type {
  Config,
  ConnectorInstanceConfig,
  GitHubConnectorConfig,
  LastRun,
  ResolvedAppCredentials,
  AppLike,
  AccessControlConfig,
  AuthConfig,
  SecretEntry,
  SecretsRegistry,
} from './schema.js';
