/** @jest-environment jsdom */
/**
 * The organization, team and token cookies are shared by every tab: an organization switch in one tab replaced them
 * for a tab still showing a team of the first organization, whose timer requests then went out for the other one
 * (#5134). A tab now keeps working in the organization of its own team.
 */
const mockCookies = { token: '', organizationId: '' };
let mockTabReader: (() => { organizationId: string; teamId: string | null; projectId: string | null } | null) | null =
	null;
let mockSessionReplaced: (() => void) | null = null;
let mockProjectChosen: ((projectId: string | null) => void) | null = null;

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockCookies.token || null,
	getSharedOrganizationIdCookie: () => mockCookies.organizationId,
	registerTabWorkScope: (
		reader: typeof mockTabReader,
		onSessionReplaced: typeof mockSessionReplaced,
		onProjectChosen: typeof mockProjectChosen
	) => {
		mockTabReader = reader;
		mockSessionReplaced = onSessionReplaced;
		mockProjectChosen = onProjectChosen;
	}
}));

import {
	TAB_SCOPE_CHANGED_EVENT,
	forgetTabAccessToken,
	isSessionRequest,
	isTabAccessToken,
	rememberTabTeam,
	requestAccessToken,
	resetTabOrganizationState,
	tabScope
} from './tab-organization';

/** An access token that decodes (only its payload is read). */
function token(
	organizationId: string,
	{
		userId = 'user-1',
		tenantId = 'tenant-1',
		expiresIn = 3600
	}: { userId?: string; tenantId?: string; expiresIn?: number } = {}
) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const issuedAt = Math.floor(Date.now() / 1000);
	const payload = { id: userId, tenantId, organizationId, iat: issuedAt, exp: issuedAt + expiresIn };
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.${organizationId}-${userId}-${expiresIn}`;
}

/** The cookies as another tab leaves them: another organization, and a token for it. */
function anotherTabSwitchesTo(organizationId: string, sharedToken = token(organizationId)) {
	mockCookies.organizationId = organizationId;
	mockCookies.token = sharedToken;
	// The memo of the scope follows the cookie string
	document.cookie = `switch=${organizationId}-${Math.random()}`;
}

const TOKEN_A = token('org-a');

beforeEach(() => {
	resetTabOrganizationState();
	mockCookies.token = TOKEN_A;
	mockCookies.organizationId = 'org-a';
	document.cookie = `start=${Math.random()}`;
});

describe('a tab whose cookies another tab moved to another organization', () => {
	it('acts with the cookies until it knows its own team', () => {
		anotherTabSwitchesTo('org-b');

		expect(tabScope()).toEqual({ held: false });
		expect(requestAccessToken()).toBe(mockCookies.token);
	});

	it('acts with the cookies while they name its own organization', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });

		expect(tabScope()).toEqual({ held: false });
		expect(requestAccessToken()).toBe(TOKEN_A);
		expect(mockTabReader?.()).toBeNull();
	});

	it('keeps its own organization, its team and the token it saw for it once another tab switched', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		const tokenB = token('org-b');
		anotherTabSwitchesTo('org-b', tokenB);

		expect(tabScope()).toEqual({
			held: true,
			organizationId: 'org-a',
			teamId: 'team-a',
			projectId: null,
			sharedOrganizationId: 'org-b',
			accessToken: TOKEN_A
		});
		expect(requestAccessToken()).toBe(TOKEN_A);
		// The organization and team cookie readers answer this tab's own
		expect(mockTabReader?.()).toEqual({ organizationId: 'org-a', teamId: 'team-a', projectId: null });
		expect(isTabAccessToken(TOKEN_A)).toBe(true);
		expect(isTabAccessToken(tokenB)).toBe(false);
	});

	it("keeps its team's project, and the one it chooses meanwhile, not the other tab's", () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a', defaultProjectId: 'project-a' });
		anotherTabSwitchesTo('org-b');

		expect(mockTabReader?.()?.projectId).toBe('project-a');
		mockProjectChosen?.('project-a2');
		expect(mockTabReader?.()?.projectId).toBe('project-a2');
	});

	it('keeps it while the switch of the token is still on its way (the organization cookie moved first)', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		mockCookies.organizationId = 'org-b';
		document.cookie = 'switching=1';

		const scope = tabScope();
		expect(scope.held && scope.accessToken).toBe(TOKEN_A);
	});

	it('follows the cookies when it picks a team of the other organization itself', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		rememberTabTeam({ id: 'team-b', organizationId: 'org-b' });
		anotherTabSwitchesTo('org-b');

		expect(tabScope()).toEqual({ held: false });
	});

	it('has no token left for its organization once that token is about to expire', () => {
		mockCookies.token = token('org-a', { expiresIn: 10 });
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		anotherTabSwitchesTo('org-b');

		const scope = tabScope();
		expect(scope.held).toBe(true);
		expect(scope.held && scope.accessToken).toBeNull();
		expect(requestAccessToken()).toBeNull();
	});

	it('never uses again a token the API refused', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		anotherTabSwitchesTo('org-b');

		forgetTabAccessToken(TOKEN_A);

		const scope = tabScope();
		expect(scope.held && scope.accessToken).toBeNull();
		expect(isTabAccessToken(TOKEN_A)).toBe(false);
	});

	it('follows the cookies when another person signed in meanwhile, and forgets its team and tokens', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		anotherTabSwitchesTo('org-b', token('org-b', { userId: 'user-2' }));

		expect(tabScope()).toEqual({ held: false });
		// Even back on the first organization's cookies, nothing of the first person is used
		anotherTabSwitchesTo('org-a', token('org-a', { userId: 'user-2' }));
		expect(isTabAccessToken(TOKEN_A)).toBe(false);
	});

	it('follows the cookies when another workspace was opened meanwhile', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		anotherTabSwitchesTo('org-b', token('org-b', { tenantId: 'tenant-2' }));

		expect(tabScope()).toEqual({ held: false });
	});

	it('starts again from the cookies after a sign-in or a sign-out in this tab', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		anotherTabSwitchesTo('org-b');

		mockSessionReplaced?.();

		expect(tabScope()).toEqual({ held: false });
		expect(requestAccessToken()).toBe(mockCookies.token);
	});

	it('follows the cookies when they hold no session', () => {
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		mockCookies.token = '';
		mockCookies.organizationId = 'org-b';
		document.cookie = 'signed-out=1';

		expect(tabScope()).toEqual({ held: false });
	});

	it('tells the page when it starts and stops working in its own organization, after the current task', async () => {
		const changes = jest.fn();
		const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
		window.addEventListener(TAB_SCOPE_CHANGED_EVENT, changes);
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		await nextTask();
		changes.mockClear();

		anotherTabSwitchesTo('org-b');
		tabScope();
		tabScope();
		// Never while a component may be rendering
		expect(changes).not.toHaveBeenCalled();
		await nextTask();
		expect(changes).toHaveBeenCalledTimes(1);

		anotherTabSwitchesTo('org-a', TOKEN_A);
		tabScope();
		await nextTask();
		expect(changes).toHaveBeenCalledTimes(2);
		window.removeEventListener(TAB_SCOPE_CHANGED_EVENT, changes);
	});
});

describe('isSessionRequest', () => {
	it.each([
		['/auth/refresh-token', true],
		['auth/switch-organization', true],
		['http://127.0.0.1:3000/api/auth/signout', true],
		['/timesheet/timer/stop', false],
		['/organization-team?authorized=1', false],
		[undefined, false]
	])('%s → %s', (url, expected) => {
		expect(isSessionRequest(url)).toBe(expected);
	});
});
