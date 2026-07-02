import { describe, it, expect } from 'vitest';
import { assertWritable, SecretWriteForbiddenError } from '../../secrets/types.js';
import type { SecretsRegistry } from '@shipit-ai/shared';

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

  it('respects writable:false even for a key the old WRITABLE_SECRETS hard-set allowed', () => {
    // setup-completed is in the old WRITABLE_SECRETS set; this registry overrides it to false.
    // Old code: would NOT throw (WRITABLE_SECRETS.has('setup-completed') = true).
    // New code: MUST throw (registry says writable: false).
    const notWritableReg: SecretsRegistry = {
      'setup-completed': {
        gsmContainer: 'c',
        consume: 'store-only',
        writable: false,
        required: false,
      },
    } as SecretsRegistry;
    expect(() => assertWritable('setup-completed', notWritableReg)).toThrow(
      SecretWriteForbiddenError,
    );
  });
});
