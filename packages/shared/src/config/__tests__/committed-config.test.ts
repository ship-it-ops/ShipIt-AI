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
