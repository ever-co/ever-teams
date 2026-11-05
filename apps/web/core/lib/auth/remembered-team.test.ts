/** @jest-environment jsdom */

import {
	REMEMBERED_TEAMS_STORAGE_KEY,
	firstListedTeam,
	forgetRememberedTeam,
	pickRememberedTeam,
	readRememberedTeam,
	rememberTeam
} from './remembered-team';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 5, 9, 0, 0);

function tenantNamed(name: string | null) {
	if (name === null) {
		return null;
	}
	return { name, logo: '' };
}

function workspace(
	tenantName: string | null,
	teamIds: string[],
	user: { lastTeamId?: string; lastLoginAt?: string } = {}
): ISigninEmailConfirmWorkspaces {
	const tenant = tenantNamed(tenantName);
	return {
		token: `token-${tenantName}`,
		user: { email: 'marie@acme.test', imageUrl: '', name: 'Marie', ...user, tenant },
		current_teams: teamIds.map((teamId) => ({
			team_id: teamId,
			team_name: teamId,
			team_logo: '',
			team_member_count: '3',
			profile_link: '',
			prefix: null
		}))
	} as unknown as ISigninEmailConfirmWorkspaces;
}

const acme = workspace('Acme', ['design', 'ops']);
const freelance = workspace('Freelance', ['clients']);

describe('pickRememberedTeam: a browser that knows the e-mail', () => {
	it('opens a team used exactly 30 days ago', () => {
		const record = { teamId: 'clients', usedAt: NOW - 30 * DAY };

		expect(pickRememberedTeam([acme, freelance], record, NOW)).toEqual({ workspaceIndex: 1, teamId: 'clients' });
	});

	it('shows the list once the team was last used more than 30 days ago', () => {
		const record = { teamId: 'clients', usedAt: NOW - 30 * DAY - 1 };

		expect(pickRememberedTeam([acme, freelance], record, NOW)).toBeNull();
	});

	it('shows the list when the person was removed from the team', () => {
		const record = { teamId: 'design', usedAt: NOW - DAY };
		const acmeWithoutDesign = workspace('Acme', ['ops']);

		expect(pickRememberedTeam([acmeWithoutDesign, freelance], record, NOW)).toBeNull();
	});

	it('shows the list when the workspace is not set up', () => {
		const record = { teamId: 'design', usedAt: NOW - DAY };

		expect(pickRememberedTeam([workspace(null, ['design'])], record, NOW)).toBeNull();
		expect(pickRememberedTeam([workspace('', ['design'])], record, NOW)).toBeNull();
	});

	it('does not fall back to the server once the browser knows the e-mail', () => {
		const record = { teamId: 'clients', usedAt: NOW - 40 * DAY };
		const recentAcme = workspace('Acme', ['design'], {
			lastTeamId: 'design',
			lastLoginAt: new Date(NOW).toISOString()
		});

		expect(pickRememberedTeam([recentAcme, freelance], record, NOW)).toBeNull();
	});

	it('shows the list after an automatic continue failed', () => {
		const record = { teamId: null, usedAt: NOW };
		const recentAcme = workspace('Acme', ['design'], {
			lastTeamId: 'design',
			lastLoginAt: new Date(NOW).toISOString()
		});

		expect(pickRememberedTeam([recentAcme], record, NOW)).toBeNull();
	});
});

describe("pickRememberedTeam: a new browser falls back to Gauzy's last team", () => {
	function signedIn(daysAgo: number) {
		return new Date(NOW - daysAgo * DAY).toISOString();
	}

	it('opens the last team of the account signed in to most recently', () => {
		const olderAcme = workspace('Acme', ['design'], { lastTeamId: 'design', lastLoginAt: signedIn(5) });
		const recentFreelance = workspace('Freelance', ['clients'], {
			lastTeamId: 'clients',
			lastLoginAt: signedIn(2)
		});

		expect(pickRememberedTeam([olderAcme, recentFreelance], null, NOW)).toEqual({
			workspaceIndex: 1,
			teamId: 'clients'
		});
	});

	it('opens it at exactly 30 days and shows the list past them', () => {
		const atLimit = workspace('Acme', ['design'], { lastTeamId: 'design', lastLoginAt: signedIn(30) });
		const pastLimit = workspace('Acme', ['design'], {
			lastTeamId: 'design',
			lastLoginAt: new Date(NOW - 30 * DAY - 1).toISOString()
		});

		expect(pickRememberedTeam([atLimit], null, NOW)).toEqual({ workspaceIndex: 0, teamId: 'design' });
		expect(pickRememberedTeam([pastLimit], null, NOW)).toBeNull();
	});

	it('shows the list when the last team is no longer listed, or there is no sign-in date', () => {
		const removed = workspace('Acme', ['ops'], { lastTeamId: 'design', lastLoginAt: signedIn(1) });
		const neverSignedIn = workspace('Acme', ['design'], { lastTeamId: 'design' });

		expect(pickRememberedTeam([removed], null, NOW)).toBeNull();
		expect(pickRememberedTeam([neverSignedIn], null, NOW)).toBeNull();
	});

	it('shows the list when that workspace is not set up', () => {
		const notSetUp = workspace(null, ['design'], { lastTeamId: 'design', lastLoginAt: signedIn(1) });

		expect(pickRememberedTeam([notSetUp], null, NOW)).toBeNull();
	});

	it('shows the list for an empty list', () => {
		expect(pickRememberedTeam([], null, NOW)).toBeNull();
	});
});

describe('firstListedTeam', () => {
	it('skips a stored team the person left instead of letting it hide the next candidate', () => {
		expect(firstListedTeam([acme, freelance], ['gone', null, 'clients', 'design'])).toEqual({
			workspaceIndex: 1,
			teamId: 'clients'
		});
	});

	it('finds nothing when no candidate is listed', () => {
		expect(firstListedTeam([acme], ['gone', undefined])).toBeNull();
	});
});

describe('the browser record', () => {
	beforeEach(() => window.localStorage.clear());

	it('is kept per e-mail address, whatever its case', () => {
		rememberTeam(' Marie@Acme.test ', 'design', NOW);

		expect(readRememberedTeam('marie@acme.test')).toEqual({ teamId: 'design', usedAt: NOW });
		expect(readRememberedTeam('paul@acme.test')).toBeNull();
	});

	it('ignores a missing e-mail or team', () => {
		rememberTeam(undefined, 'design', NOW);
		rememberTeam('marie@acme.test', undefined, NOW);

		expect(window.localStorage.getItem(REMEMBERED_TEAMS_STORAGE_KEY)).toBeNull();
	});

	it('keeps the e-mail without a team once forgotten', () => {
		rememberTeam('marie@acme.test', 'design', NOW);
		forgetRememberedTeam('marie@acme.test', NOW + 1);

		expect(readRememberedTeam('marie@acme.test')).toEqual({ teamId: null, usedAt: NOW + 1 });
	});

	it('reads nothing from a damaged value', () => {
		window.localStorage.setItem(REMEMBERED_TEAMS_STORAGE_KEY, '{not json');
		expect(readRememberedTeam('marie@acme.test')).toBeNull();

		window.localStorage.setItem(REMEMBERED_TEAMS_STORAGE_KEY, JSON.stringify({ 'marie@acme.test': { teamId: 3 } }));
		expect(readRememberedTeam('marie@acme.test')).toBeNull();
	});
});
