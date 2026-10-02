/**
 * What the workspace chooser reads from the next-auth session after an Ever ID sign-in: the workspaces in the
 * chooser's shape, the verified address, the workspace to start on, and whether team lists are known.
 */
import { readEverIdSession, toEverIdChooserData } from './session';

const workspace = (id: string, tenantId: string | null, name: string) => ({
	token: `workspace-token-${id}`,
	user: {
		id,
		email: 'person@example.test',
		name: 'Test Person',
		imageUrl: null,
		lastTeamId: null,
		lastLoginAt: '2026-09-01T10:00:00.000Z',
		tenant: tenantId ? { id: tenantId, name, logo: '' } : null
	}
});

describe('readEverIdSession', () => {
	it('reads the chooser data of an Ever ID sign-in', () => {
		const data = readEverIdSession({
			user: { name: 'Test Person' },
			authCookie: {
				provider: 'ever-id',
				workspaces: [workspace('u1', 't1', 'Acme'), workspace('u2', 't2', 'Beta')],
				confirmed_mail: 'person@example.test',
				preselectTenantId: 't2'
			}
		});

		expect(data?.confirmedEmail).toBe('person@example.test');
		expect(data?.preselectIndex).toBe(1);
		expect(data?.teamsUnavailable).toBe(true);
		expect(data?.workspaces.map((entry) => [entry.token, entry.user.tenant.name])).toEqual([
			['workspace-token-u1', 'Acme'],
			['workspace-token-u2', 'Beta']
		]);
	});

	it('starts on no particular workspace without a preselected tenant', () => {
		const data = readEverIdSession({
			authCookie: { provider: 'ever-id', workspaces: [workspace('u1', 't1', 'Acme')], confirmed_mail: 'a@b.test' }
		});

		expect(data?.preselectIndex).toBe(-1);
	});

	it.each([
		['no session', null],
		[
			'a session of another sign-in',
			{ authCookie: { access_token: 'x', workspaces: [workspace('u1', 't1', 'A')] } }
		],
		['an Ever ID session without workspaces', { authCookie: { provider: 'ever-id', workspaces: [] } }],
		['entries without a token', { authCookie: { provider: 'ever-id', workspaces: [{ user: { id: 'u1' } }] } }],
		[
			'entries with an empty token',
			{ authCookie: { provider: 'ever-id', workspaces: [{ token: '', user: { id: 'u1' } }] } }
		]
	])('returns null for %s', (_label, session) => {
		expect(readEverIdSession(session)).toBeNull();
	});
});

describe('toEverIdChooserData', () => {
	it('keeps the team lists when the answer has them', () => {
		const teams = [
			{
				team_id: 'team-1',
				team_name: 'Team',
				team_logo: '',
				team_member_count: '1',
				profile_link: '',
				prefix: null
			}
		];
		const data = toEverIdChooserData([{ ...workspace('u1', 't1', 'Acme'), current_teams: teams }], 'a@b.test');

		expect(data?.teamsUnavailable).toBe(false);
		expect(data?.workspaces[0].current_teams).toEqual(teams);
	});

	it('lists every workspace without teams as soon as one entry has no team list', () => {
		const teams = [
			{
				team_id: 'team-1',
				team_name: 'Team',
				team_logo: '',
				team_member_count: '1',
				profile_link: '',
				prefix: null
			}
		];
		const data = toEverIdChooserData(
			[{ ...workspace('u1', 't1', 'Acme'), current_teams: teams }, workspace('u2', 't2', 'Beta')],
			'a@b.test'
		);

		expect(data?.teamsUnavailable).toBe(true);
		expect(data?.workspaces).toHaveLength(2);
	});

	it('never hands the chooser a team list that is not a list', () => {
		const data = toEverIdChooserData([{ ...workspace('u1', 't1', 'Acme'), current_teams: 'none' }], 'a@b.test');

		expect(data?.workspaces[0].current_teams).toEqual([]);
		expect(data?.teamsUnavailable).toBe(true);
	});

	it('names a workspace without a tenant by the person', () => {
		const data = toEverIdChooserData([workspace('u1', null, '')], 'a@b.test');

		expect(data?.workspaces[0].user.tenant).toEqual({ name: '', logo: '' });
		expect(data?.workspaces[0].user.name).toBe('Test Person');
	});
});
