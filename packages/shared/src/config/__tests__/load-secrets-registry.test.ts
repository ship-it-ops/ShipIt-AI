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
