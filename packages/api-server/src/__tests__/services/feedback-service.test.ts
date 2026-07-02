import { describe, it, expect, vi } from 'vitest';
import {
  FeedbackService,
  FeedbackDisabledError,
  IssueCreateError,
  buildIssueBody,
  redactSecrets,
  type FeedbackConfigView,
} from '../../services/feedback-service.js';
import { ResolvedSecrets } from '../../secrets/index.js';

const REPO: FeedbackConfigView = {
  enabled: true,
  repo: { owner: 'ship-it-ops', name: 'shipit-ai' },
  defaultLabels: ['user-report'],
};

const TOKEN_SECRET = 'github-feedback-token';
const withToken = new ResolvedSecrets(new Map([[TOKEN_SECRET, 't']]));
const noToken = new ResolvedSecrets(new Map());

function fakeOctokit(
  create = vi.fn(async (_args: Record<string, unknown>) => ({
    data: { html_url: 'https://x/issues/7', number: 7 },
  })),
) {
  return { create, octokit: { rest: { issues: { create } } } };
}

const mkSvc = (feedback: FeedbackConfigView, resolved: ResolvedSecrets) =>
  new FeedbackService({
    feedback,
    resolved,
    tokenSecret: TOKEN_SECRET,
    octokitForToken: async () => fakeOctokit().octokit as never,
  });

describe('FeedbackService.isConfigured', () => {
  it('requires enabled + repo, but NOT the token (launcher visibility)', () => {
    // The whole point: a configured deployment shows the launcher even without
    // a token — it errors on submit instead of hiding.
    expect(mkSvc(REPO, noToken).isConfigured()).toBe(true);
    expect(mkSvc(REPO, withToken).isConfigured()).toBe(true);
    expect(mkSvc({ ...REPO, enabled: false }, noToken).isConfigured()).toBe(false);
    expect(mkSvc({ ...REPO, repo: { owner: '', name: '' } }, noToken).isConfigured()).toBe(false);
  });
});

describe('FeedbackService.isEnabled', () => {
  it('requires enabled + repo + token (gates actual filing)', () => {
    expect(mkSvc(REPO, withToken).isEnabled()).toBe(true);
    expect(mkSvc(REPO, noToken).isEnabled()).toBe(false); // no token
    expect(mkSvc({ ...REPO, enabled: false }, withToken).isEnabled()).toBe(false);
    expect(mkSvc({ ...REPO, repo: { owner: '', name: '' } }, withToken).isEnabled()).toBe(false);
  });
});

describe('FeedbackService.createReport', () => {
  it('files an issue with mapped labels + reporter, returns the url + number', async () => {
    const ok = fakeOctokit();
    const svc = new FeedbackService({
      feedback: REPO,
      resolved: new ResolvedSecrets(new Map([[TOKEN_SECRET, 'tok']])),
      tokenSecret: TOKEN_SECRET,
      octokitForToken: async () => ok.octokit as never,
    });

    const result = await svc.createReport({
      type: 'feature',
      title: 'Add dark mode',
      description: 'Please add a dark theme.',
      reporter: { email: 'user@example.com', provider: 'github', role: 'member' },
      context: { url: 'https://portal/x', userAgent: 'Firefox' },
    });

    expect(result.issueUrl).toBe('https://x/issues/7');
    expect(result.issueNumber).toBe(7);

    const args = ok.create.mock.calls[0][0];
    expect(args.owner).toBe('ship-it-ops');
    expect(args.repo).toBe('shipit-ai');
    expect(args.title).toContain('Add dark mode');
    expect(args.labels).toEqual(['user-report', 'feature']);
    expect(args.body).toContain('user@example.com');
    expect(args.body).toContain('Please add a dark theme.');
  });

  it('throws FeedbackDisabledError when not configured', async () => {
    const svc = new FeedbackService({
      feedback: REPO,
      resolved: new ResolvedSecrets(new Map()),
      tokenSecret: TOKEN_SECRET,
    });
    await expect(
      svc.createReport({
        type: 'bug',
        title: 't',
        description: 'd',
        reporter: { email: 'a@b.c' },
      }),
    ).rejects.toBeInstanceOf(FeedbackDisabledError);
  });

  it('wraps an Octokit failure in IssueCreateError', async () => {
    const svc = new FeedbackService({
      feedback: REPO,
      resolved: new ResolvedSecrets(new Map([[TOKEN_SECRET, 'tok']])),
      tokenSecret: TOKEN_SECRET,
      octokitForToken: async () =>
        ({
          rest: {
            issues: {
              create: async () => {
                throw new Error('403 Resource not accessible');
              },
            },
          },
        }) as never,
    });
    await expect(
      svc.createReport({ type: 'bug', title: 't', description: 'd', reporter: { email: 'a@b.c' } }),
    ).rejects.toBeInstanceOf(IssueCreateError);
  });
});

describe('FeedbackService.checkRateLimit', () => {
  it('allows the first submit and blocks the second within the window', async () => {
    const store = new Map<string, string>();
    const redis = {
      set: vi.fn(async (key: string, _v: string, _ex: string, _n: number, mode: string) => {
        if (mode === 'NX' && store.has(key)) return null;
        store.set(key, '1');
        return 'OK';
      }),
    };
    const svc = new FeedbackService({
      feedback: REPO,
      resolved: new ResolvedSecrets(new Map()),
      tokenSecret: TOKEN_SECRET,
      redis: redis as never,
    });
    expect(await svc.checkRateLimit('user-1')).toBe(true);
    expect(await svc.checkRateLimit('user-1')).toBe(false);
    expect(await svc.checkRateLimit('user-2')).toBe(true);
  });

  it('fails open (allows) without Redis', async () => {
    const svc = new FeedbackService({
      feedback: REPO,
      resolved: new ResolvedSecrets(new Map()),
      tokenSecret: TOKEN_SECRET,
    });
    expect(await svc.checkRateLimit('user-1')).toBe(true);
  });
});

describe('buildIssueBody + redactSecrets', () => {
  it('includes description, environment, and a collapsed logs block', () => {
    const body = buildIssueBody({
      type: 'bug',
      title: 'x',
      description: 'It broke',
      reporter: { email: 'r@e.c', provider: 'oidc', role: 'admin' },
      context: { url: 'https://p/a', route: '/a', userAgent: 'UA', viewport: '1x1' },
      logs: [{ level: 'error', message: 'boom' }],
    });
    expect(body).toContain('## Description');
    expect(body).toContain('It broke');
    expect(body).toContain('**Reported by:** r@e.c');
    expect(body).toContain('https://p/a');
    expect(body).toContain('<details>');
    expect(body).toContain('[error] boom');
  });

  it('redacts tokens, bearer headers, and jwts', () => {
    expect(redactSecrets('token github_pat_1234567890abcdefghijklmnop')).toContain(
      '[redacted-token]',
    );
    expect(redactSecrets('Authorization: Bearer abc.def-ghi')).toContain('Bearer [redacted]');
    expect(redactSecrets('jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9aaa')).toContain(
      '[redacted-jwt]',
    );
  });

  it('redacts secrets inside the issue body logs', () => {
    const body = buildIssueBody({
      type: 'bug',
      title: 'x',
      description: 'ok',
      reporter: { email: 'r@e.c' },
      logs: [{ level: 'log', message: 'using github_pat_1234567890abcdefghijklmnop now' }],
    });
    expect(body).toContain('[redacted-token]');
    expect(body).not.toContain('github_pat_1234567890abcdefghijklmnop');
  });
});
