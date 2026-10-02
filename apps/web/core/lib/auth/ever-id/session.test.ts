/**
 * What the workspace chooser reads from the next-auth session after an Ever ID sign-in: the workspaces in the
 * chooser's shape, the verified address, the workspace to start on, and whether team lists are known.
 */
import {
	everIdSetupTarget,
	isExpiredWorkspaceTokenError,
	isWorkspaceTokenExpired,
	readEverIdSession,
	toEverIdChooserData
} from './session';

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
		// No team of one workspace can then be sent with another workspace's token.
		expect(data?.workspaces.map((entry) => entry.current_teams)).toEqual([[], []]);
	});

	it('never hands the chooser a team list that is not a list', () => {
		const data = toEverIdChooserData([{ ...workspace('u1', 't1', 'Acme'), current_teams: 'none' }], 'a@b.test');

		expect(data?.workspaces[0].current_teams).toEqual([]);
		expect(data?.teamsUnavailable).toBe(true);
	});

	it('lists the workspaces without a tenant yet (their setup did not finish)', () => {
		const data = toEverIdChooserData(
			[workspace('u1', 't1', 'Acme'), workspace('u2', null, ''), workspace('u3', 't3', 'Beta')],
			'a@b.test'
		);

		expect(data?.tenantless).toEqual([1]);
	});

	it('names a workspace without a tenant by the person', () => {
		const data = toEverIdChooserData([workspace('u1', null, '')], 'a@b.test');

		expect(data?.workspaces[0].user.tenant).toEqual({ name: '', logo: '' });
		expect(data?.workspaces[0].user.name).toBe('Test Person');
	});
});

describe('everIdSetupTarget', () => {
	const session = (workspaces: unknown[], confirmed = 'person@example.test') => ({
		authCookie: { provider: 'ever-id', workspaces, confirmed_mail: confirmed }
	});

	it('finds the workspace without a tenant at a chooser index, with its token, the address and the user', () => {
		expect(everIdSetupTarget(session([workspace('u1', 't1', 'Acme'), workspace('u2', null, '')]), 1)).toEqual({
			token: 'workspace-token-u2',
			email: 'person@example.test',
			userId: 'u2'
		});
	});

	it.each([
		['a workspace that has its tenant', session([workspace('u1', 't1', 'Acme')]), 0],
		['an index outside the list', session([workspace('u2', null, '')]), 3],
		['a session of another sign-in', { authCookie: { workspaces: [workspace('u2', null, '')] } }, 0],
		['no session', null, 0]
	])('finds nothing for %s', (_label, value, index) => {
		expect(everIdSetupTarget(value, index)).toBeNull();
	});

	it('counts the indexes as the chooser does (entries without a token are not listed)', () => {
		const list = [{ user: { id: 'x' } }, workspace('u2', null, '')];

		expect(everIdSetupTarget(session(list), 0)?.userId).toBe('u2');
	});
});

describe('workspace token expiry', () => {
	const token = (payload: Record<string, unknown>) =>
		[{ alg: 'none' }, payload].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') +
		'.x';
	const now = Date.UTC(2026, 9, 2, 12, 0, 0);

	it.each([
		['expired a minute ago', { exp: now / 1000 - 60 }, true],
		['expiring within 30 s', { exp: now / 1000 + 20 }, true],
		['valid for another ten minutes', { exp: now / 1000 + 600 }, false],
		['without an expiry', { sub: 'u1' }, false]
	])('reads a token %s', (_label, payload, expired) => {
		expect(isWorkspaceTokenExpired(token(payload), now)).toBe(expired);
	});

	it('takes an unreadable token as valid (the API checks it)', () => {
		expect(isWorkspaceTokenExpired('not-a-jwt', now)).toBe(false);
	});

	it.each([
		[
			'the expired-token answer',
			{ response: { status: 400, data: { message: 'JWT token has been expired.' } } },
			true
		],
		['another bad request', { response: { status: 400, data: { message: 'Invalid team' } } }, false],
		['an unauthorized answer', { response: { status: 401, data: { message: 'expired' } } }, false],
		['a request that could not be sent', new TypeError('Failed to fetch'), false]
	])('recognises %s', (_label, error, expected) => {
		expect(isExpiredWorkspaceTokenError(error)).toBe(expected);
	});
});
