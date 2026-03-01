import type { Octokit } from '@octokit/rest';
import type { FetchResult } from '@shipit-ai/connector-sdk';

export interface GitHubTeam {
  slug: string;
  name: string;
  description: string | null;
  privacy: string;
  html_url: string;
  members: GitHubTeamMember[];
}

export interface GitHubTeamMember {
  login: string;
  avatar_url: string;
  html_url: string;
  role: string;
}

export async function fetchTeams(
  octokit: Octokit,
  org: string,
  cursor?: string,
): Promise<FetchResult> {
  const page = cursor ? Number(cursor) : 1;
  const perPage = 100;

  const { data: teams } = await octokit.rest.teams.list({
    org,
    per_page: perPage,
    page,
  });

  const entities: GitHubTeam[] = [];

  for (const team of teams) {
    const { data: members } = await octokit.rest.teams.listMembersInOrg({
      org,
      team_slug: team.slug,
      per_page: 100,
    });

    entities.push({
      slug: team.slug,
      name: team.name,
      description: team.description,
      privacy: team.privacy ?? 'closed',
      html_url: team.html_url,
      members: members.map((m) => ({
        login: m.login,
        avatar_url: m.avatar_url,
        html_url: m.html_url,
        role: 'member',
      })),
    });
  }

  return {
    entities,
    cursor: teams.length === perPage ? String(page + 1) : undefined,
    has_more: teams.length === perPage,
  };
}
