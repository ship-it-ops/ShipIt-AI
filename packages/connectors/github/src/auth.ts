import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import type { AuthResult } from '@shipit-ai/connector-sdk';

export interface GitHubAppCredentials {
  appId: string;
  privateKey: string;
  installationId: string;
}

export interface GitHubPATCredentials {
  token: string;
}

export async function authenticateGitHubApp(
  credentials: GitHubAppCredentials,
): Promise<{ auth: AuthResult; octokit: Octokit | null }> {
  try {
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: credentials.appId,
        privateKey: credentials.privateKey,
        installationId: credentials.installationId,
      },
    });

    // Verify auth by fetching the installation
    await octokit.rest.apps.getInstallation({
      installation_id: Number(credentials.installationId),
    });

    return {
      auth: { success: true },
      octokit,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      auth: { success: false, error: `GitHub App auth failed: ${message}` },
      octokit: null,
    };
  }
}

export async function authenticatePAT(
  credentials: GitHubPATCredentials,
): Promise<{ auth: AuthResult; octokit: Octokit | null }> {
  try {
    const octokit = new Octokit({ auth: credentials.token });

    // Verify auth by fetching the authenticated user
    await octokit.rest.users.getAuthenticated();

    return {
      auth: { success: true },
      octokit,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      auth: { success: false, error: `PAT auth failed: ${message}` },
      octokit: null,
    };
  }
}
