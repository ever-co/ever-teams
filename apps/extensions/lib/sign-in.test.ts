import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { installFakeFetch } from '../test/fake-chrome.ts';
import { enterWorkspace } from './gauzy.ts';
import type { WorkspaceChoice } from './workspaces.ts';

const API_URL = 'https://api.example.test';

const SESSION_ANSWER = {
	token: 'access-1',
	refresh_token: 'refresh-1',
	user: {
		id: 'user-1',
		email: 'marie@example.test',
		tenantId: 'tenant-1',
		employee: { id: 'employee-1', organizationId: 'organization-1' }
	}
};

const TEAMS = [
	{ id: 'team-1', name: 'Research' },
	{ id: 'team-2', name: 'Lab' }
];

describe('enterWorkspace', () => {
	// Gauzy's `POST /auth/signin.workspace` reads email, token, lastOrganizationId and lastTeamId and drops any other
	// field (whitelist): the confirmed code is not sent again, the workspace token the confirmation answered is the proof
	it("sends the email, the workspace's token and the team the session opens, as lastTeamId", async () => {
		const calls = installFakeFetch(() => ({ status: 200, body: SESSION_ANSWER }));
		const workspace: WorkspaceChoice = {
			token: 'workspace-token-1',
			name: 'Labs',
			lastTeamId: 'team-2',
			teams: TEAMS
		};

		const session = await enterWorkspace(API_URL, 'marie@example.test', workspace);

		assert.equal(calls[0].url, `${API_URL}/api/auth/signin.workspace`);
		assert.deepEqual(calls[0].body, {
			email: 'marie@example.test',
			token: 'workspace-token-1',
			lastTeamId: 'team-2'
		});
		assert.equal(session?.teamId, 'team-2');
	});

	it('names the first team when the last one is no longer among the teams, and none without teams', async () => {
		const calls = installFakeFetch(() => ({ status: 200, body: SESSION_ANSWER }));

		await enterWorkspace(API_URL, 'marie@example.test', {
			token: 'workspace-token-1',
			name: 'Labs',
			lastTeamId: 'team-gone',
			teams: TEAMS
		});
		await enterWorkspace(API_URL, 'marie@example.test', { token: 'workspace-token-2', name: 'Solo', teams: [] });

		assert.deepEqual(calls[0].body, {
			email: 'marie@example.test',
			token: 'workspace-token-1',
			lastTeamId: 'team-1'
		});
		assert.deepEqual(calls[1].body, { email: 'marie@example.test', token: 'workspace-token-2' });
	});
});
