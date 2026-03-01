export interface EventBusConfig {
  redisUrl: string;
  queueName?: string;
  maxRetries?: number;
  retentionDays?: number;
  batchSize?: number;
  concurrency?: number;
}

export interface ResolvedConfig {
  redisHost: string;
  redisPort: number;
  queueName: string;
  maxRetries: number;
  retentionDays: number;
  batchSize: number;
  concurrency: number;
}

export const DEFAULT_CONFIG = {
  queueName: 'shipit-events',
  maxRetries: 3,
  retentionDays: 7,
  batchSize: 500,
  concurrency: 1,
} as const satisfies Required<Omit<EventBusConfig, 'redisUrl'>>;

export function resolveConfig(config: EventBusConfig): ResolvedConfig {
  const url = new URL(config.redisUrl);
  return {
    redisHost: url.hostname,
    redisPort: Number(url.port) || 6379,
    queueName: config.queueName ?? DEFAULT_CONFIG.queueName,
    maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    retentionDays: config.retentionDays ?? DEFAULT_CONFIG.retentionDays,
    batchSize: config.batchSize ?? DEFAULT_CONFIG.batchSize,
    concurrency: config.concurrency ?? DEFAULT_CONFIG.concurrency,
  };
}
