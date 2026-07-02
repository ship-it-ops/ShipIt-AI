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
