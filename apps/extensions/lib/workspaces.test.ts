import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renewedSessionOf, sessionFrom, workspacesOf, type Session } from './workspaces.ts';

const confirmAnswer = {
	workspaces: [
		{
			token: 'workspace-token-1',
			user: { name: 'Marie Curie', lastTeamId: 'team-2', tenant: { name: 'Ever' } },
			current_teams: [
				{ team_id: 'team-1', team_name: 'Designers' },
				{ team_id: 'team-2', team_name: 'Developers' }
			]
		},
		{ token: 'workspace-token-2', user: { name: 'Marie Curie', tenant: { name: 'Labs' } }, current_teams: [] }
	]
};

describe('workspacesOf', () => {
	it('reads each workspace of a confirmed email code with its teams', () => {
		const workspaces = workspacesOf(confirmAnswer);

		assert.equal(workspaces.length, 2);
		assert.deepEqual(workspaces[0], {
			token: 'workspace-token-1',
			name: 'Ever',
			lastTeamId: 'team-2',
			teams: [
				{ id: 'team-1', name: 'Designers' },
				{ id: 'team-2', name: 'Developers' }
			]
		});
		assert.deepEqual(workspaces[1].teams, []);
	});

	it('reads an answer without workspaces as none', () => {
		assert.deepEqual(workspacesOf({}), []);
		assert.deepEqual(workspacesOf(null), []);
	});
});

describe('sessionFrom', () => {
	const signIn = {
		token: 'access',
		refresh_token: 'refresh',
		user: {
			id: 'user-1',
			email: 'marie@example.com',
			firstName: 'Marie',
			lastName: 'Curie',
			tenantId: 'tenant-1',
			lastOrganizationId: 'org-last',
			employee: { id: 'employee-1', organizationId: 'org-1' }
		}
	};
	const workspace = workspacesOf(confirmAnswer)[0];

	it("keeps what the timer and the task list need, with the workspace's last team active", () => {
		assert.deepEqual(sessionFrom(signIn, workspace, 'https://api.example.com'), {
			apiUrl: 'https://api.example.com',
			token: 'access',
			refreshToken: 'refresh',
			userId: 'user-1',
			email: 'marie@example.com',
			name: 'Marie Curie',
			tenantId: 'tenant-1',
			organizationId: 'org-1',
			employeeId: 'employee-1',
			teams: workspace.teams,
			teamId: 'team-2'
		});
	});

	it('falls back to the first team, and to the last organization when the user has no employee', () => {
		const noEmployee = { ...signIn, user: { ...signIn.user, employee: null } };
		const session = sessionFrom(noEmployee, { ...workspace, lastTeamId: undefined }, 'https://api.example.com');

		assert.equal(session?.teamId, 'team-1');
		assert.equal(session?.organizationId, 'org-last');
		assert.equal(session?.employeeId, null);
	});

	it('refuses an answer without an access token', () => {
		assert.equal(sessionFrom({ user: signIn.user }, workspace, 'https://api.example.com'), null);
	});
});

describe('renewedSessionOf', () => {
	const signedIn: Session = {
		apiUrl: 'https://api.ever.team',
		token: 'access-1',
		refreshToken: 'refresh-1',
		userId: 'user-1',
		email: 'marie@ever.co',
		name: 'Marie Curie',
		tenantId: 'tenant-1',
		organizationId: 'org-1',
		employeeId: 'employee-1',
		teams: [],
		teamId: 'team-1'
	};

	it('keeps the new access token and the refresh token the API rotated', () => {
		const answer = { token: 'access-2', refresh_token: 'refresh-2' };
		const next = renewedSessionOf(signedIn, signedIn, answer);
		assert.equal(next?.token, 'access-2');
		assert.equal(next?.refreshToken, 'refresh-2');
	});

	it('keeps the refresh token it had when the API sends none', () => {
		assert.equal(renewedSessionOf(signedIn, signedIn, { token: 'access-2' })?.refreshToken, 'refresh-1');
	});

	it('keeps what changed in the stored session meanwhile, such as the active team', () => {
		const stored = { ...signedIn, teamId: 'team-2' };
		assert.equal(renewedSessionOf(stored, signedIn, { token: 'access-2' })?.teamId, 'team-2');
	});

	it('keeps nothing once the person signed out or signed in again meanwhile', () => {
		assert.equal(renewedSessionOf(null, signedIn, { token: 'access-2' }), null);
		const signedInAgain = { ...signedIn, refreshToken: 'refresh-9' };
		assert.equal(renewedSessionOf(signedInAgain, signedIn, { token: 'access-2' }), null);
	});

	it('keeps nothing when the answer holds no access token', () => {
		assert.equal(renewedSessionOf(signedIn, signedIn, { message: 'Unauthorized' }), null);
	});
});
