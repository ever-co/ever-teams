/** @jest-environment jsdom */
/**
 * Two tabs of one browser in two organizations of the workspace (#5134). The organization, team and token cookies are
 * shared by every tab: once the second tab switched them to its organization, the first tab's timer requests went out
 * with that organization and its token. Gauzy then filed its heartbeats in the other organization, answered its stop
 * with a 406 while its run went on, and refused a member's team list (400). The first tab now sends its requests with
 * its own organization, team and token.
 */
import { AxiosAdapter, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const mockRenewSession = jest.fn();

jest.mock('@/core/lib/auth/session-renewal', () => ({
	renewSession: (...args: unknown[]) => mockRenewSession(...args)
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('../logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('../logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import { ACTIVE_PROJECT_COOKIE_NAME } from '@/core/constants/config/constants';
import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getSharedOrganizationIdCookie,
	setAccessTokenCookie,
	setActiveTeamIdCookie,
	setAuthCookies,
	setActiveProjectIdCookie,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import {
	TAB_TEAM_HEADER,
	TabOrganizationChangedError,
	forgetTabAccessToken,
	rememberTabTeam,
	resetTabOrganizationState
} from '@/core/lib/auth/tab-organization';
import { APIService } from './api.service';

/** An access token that decodes (only its payload is read). */
function token(organizationId: string, userId = 'user-1', expiresIn = 3600) {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const issuedAt = Math.floor(Date.now() / 1000);
	const payload = { id: userId, tenantId: 'tenant-1', organizationId, iat: issuedAt, exp: issuedAt + expiresIn };
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-${organizationId}-${expiresIn}`;
}

const TOKEN_A = token('org-a');
const TOKEN_B = token('org-b');

function answer(config: InternalAxiosRequestConfig, status = 200): AxiosResponse {
	return { config, data: { ok: status < 400 }, headers: {}, status, statusText: String(status) };
}

/** The requests that reached the network, and their answer (200, or the status `refuse` gives). */
function network(refuse?: (config: InternalAxiosRequestConfig) => number | undefined) {
	const sent: InternalAxiosRequestConfig[] = [];
	const adapter: AxiosAdapter = async (config) => {
		sent.push(config);
		const status = refuse?.(config);
		if (status) {
			const error = Object.assign(new Error(`Request failed with status code ${status}`), {
				config,
				response: answer(config, status),
				isAxiosError: true
			});
			throw error;
		}
		return answer(config);
	};
	return { sent, adapter };
}

const header = (config: InternalAxiosRequestConfig | undefined, name: string) =>
	(config?.headers as AxiosHeaders | undefined)?.get(name);

/** Tab A works in organization A on team A; then tab B switches the shared cookies to organization B and team B. */
function twoTabsInTwoOrganizations() {
	setAuthCookies({
		access_token: TOKEN_A,
		refresh_token: { token: 'refresh-a' },
		tenantId: 'tenant-1',
		teamId: 'team-a',
		organizationId: 'org-a',
		languageId: 'en',
		noTeamPopup: true,
		userId: 'user-1'
	} as never);
	rememberTabTeam({ id: 'team-a', organizationId: 'org-a', defaultProjectId: 'project-a' });
	// What tab B's switch writes to the shared cookies
	document.cookie = `${ACTIVE_PROJECT_COOKIE_NAME}=project-b; path=/`;
	setActiveTeamIdCookie('team-b');
	setOrganizationIdCookie('org-b');
	setAccessTokenCookie(TOKEN_B);
}

beforeEach(() => {
	resetTabOrganizationState();
	mockRenewSession.mockReset();
	jest.spyOn(console, 'debug').mockImplementation(() => undefined);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('a tab whose shared cookies another tab moved to another organization', () => {
	it("reads its own organization and team, not the other tab's", () => {
		twoTabsInTwoOrganizations();

		expect(getSharedOrganizationIdCookie()).toBe('org-b');
		expect(getOrganizationIdCookie()).toBe('org-a');
		expect(getActiveTeamIdCookie()).toBe('team-a');
		expect(getActiveProjectIdCookie()).toBe('project-a');
	});

	it("keeps the project it chooses to itself, and leaves the other tab's project cookie as it is", () => {
		twoTabsInTwoOrganizations();

		setActiveProjectIdCookie('project-a2');

		expect(getActiveProjectIdCookie()).toBe('project-a2');
		expect(document.cookie).toContain(`${ACTIVE_PROJECT_COOKIE_NAME}=project-b`);
	});

	it('keeps the project it chose while the cookies were still its own (CodeRabbit on #5321)', () => {
		setAuthCookies({
			access_token: TOKEN_A,
			refresh_token: { token: 'refresh-a' },
			tenantId: 'tenant-1',
			teamId: 'team-a',
			organizationId: 'org-a',
			languageId: 'en',
			noTeamPopup: true,
			userId: 'user-1'
		} as never);
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a', defaultProjectId: 'project-a' });
		setActiveProjectIdCookie('project-a2');
		expect(document.cookie).toContain(`${ACTIVE_PROJECT_COOKIE_NAME}=project-a2`);

		// Tab B's switch
		document.cookie = `${ACTIVE_PROJECT_COOKIE_NAME}=project-b; path=/`;
		setActiveTeamIdCookie('team-b');
		setOrganizationIdCookie('org-b');
		setAccessTokenCookie(TOKEN_B);

		expect(getActiveProjectIdCookie()).toBe('project-a2');
	});

	it('sends its timer stop to the API with its own organization and token', async () => {
		twoTabsInTwoOrganizations();
		const service = new APIService('http://127.0.0.1:3311', { enableLogging: false });
		const { sent, adapter } = network();
		service.axiosInstance.defaults.adapter = adapter;

		await service.axiosInstance.post('/timesheet/timer/stop', { organizationId: getOrganizationIdCookie() });

		expect(header(sent[0], 'Authorization')).toBe(`Bearer ${TOKEN_A}`);
		expect(JSON.parse(String(sent[0].data)).organizationId).toBe('org-a');
		// The API is on another origin: it is never sent this app's own header
		expect(header(sent[0], TAB_TEAM_HEADER)).toBeUndefined();
	});

	it("names its own team to this app's routes in proxy mode", async () => {
		twoTabsInTwoOrganizations();
		const service = new APIService(`${window.location.origin}/api`, { enableLogging: false });
		const { sent, adapter } = network();
		service.axiosInstance.defaults.adapter = adapter;

		await service.axiosInstance.post('/timer/stop', {});

		expect(header(sent[0], 'Authorization')).toBe(`Bearer ${TOKEN_A}`);
		expect(header(sent[0], TAB_TEAM_HEADER)).toBe('team-a');
	});

	it('keeps the token a pinned request carries', async () => {
		twoTabsInTwoOrganizations();
		const service = new APIService('http://127.0.0.1:3311', { enableLogging: false });
		const { sent, adapter } = network();
		service.axiosInstance.defaults.adapter = adapter;

		await service.axiosInstance.get('/organization-team', {
			headers: { Authorization: 'Bearer pinned-token' },
			pinnedAuthorization: true
		} as never);

		expect(header(sent[0], 'Authorization')).toBe('Bearer pinned-token');
	});

	it('sends nothing once its token for its organization is gone, but the session requests', async () => {
		twoTabsInTwoOrganizations();
		forgetTabAccessToken(TOKEN_A);
		const service = new APIService('http://127.0.0.1:3311', { enableLogging: false });
		const { sent, adapter } = network();
		service.axiosInstance.defaults.adapter = adapter;

		await expect(service.axiosInstance.post('/timesheet/time-slot', {})).rejects.toBeInstanceOf(
			TabOrganizationChangedError
		);
		expect(sent).toHaveLength(0);

		// Renewing the session, signing out or switching the organization back still go out, as the session
		await service.axiosInstance.post('/auth/switch-organization', { organizationId: 'org-a' });
		expect(sent).toHaveLength(1);
		expect(header(sent[0], 'Authorization')).toBe(`Bearer ${TOKEN_B}`);
	});

	it('never renews its own token when the API refuses it: it stops using it', async () => {
		twoTabsInTwoOrganizations();
		const service = new APIService('http://127.0.0.1:3311', { enableLogging: false });
		const { sent, adapter } = network(() => 401);
		service.axiosInstance.defaults.adapter = adapter;

		await expect(service.axiosInstance.get('/timesheet/timer/status')).rejects.toBeTruthy();

		expect(mockRenewSession).not.toHaveBeenCalled();
		expect(sent).toHaveLength(1);
		await expect(service.axiosInstance.get('/timesheet/timer/status')).rejects.toBeInstanceOf(
			TabOrganizationChangedError
		);
		expect(sent).toHaveLength(1);
	});

	it('sends a refused request again with the token another tab renewed meanwhile, in the same organization', async () => {
		setAuthCookies({
			access_token: TOKEN_A,
			refresh_token: { token: 'refresh-a' },
			tenantId: 'tenant-1',
			teamId: 'team-a',
			organizationId: 'org-a',
			languageId: 'en',
			noTeamPopup: true,
			userId: 'user-1'
		} as never);
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		const renewedToken = token('org-a', 'user-1', 7200);
		mockRenewSession.mockResolvedValue({ outcome: 'renewed' });
		const service = new APIService('http://127.0.0.1:3311', { enableLogging: false });
		const { sent, adapter } = network(() => {
			if (sent.length > 1) return undefined;
			// Another tab renews the session while this request is on its way, and the API refuses the old token
			setAccessTokenCookie(renewedToken);
			return 401;
		});
		service.axiosInstance.defaults.adapter = adapter;

		await service.axiosInstance.get('/timesheet/timer/status');

		expect(sent).toHaveLength(2);
		expect(header(sent[1], 'Authorization')).toBe(`Bearer ${renewedToken}`);
	});

	it('acts with the cookies as before while they name its own organization', async () => {
		setAuthCookies({
			access_token: TOKEN_A,
			refresh_token: { token: 'refresh-a' },
			tenantId: 'tenant-1',
			teamId: 'team-a',
			organizationId: 'org-a',
			languageId: 'en',
			noTeamPopup: true,
			userId: 'user-1'
		} as never);
		rememberTabTeam({ id: 'team-a', organizationId: 'org-a' });
		const service = new APIService(`${window.location.origin}/api`, { enableLogging: false });
		const { sent, adapter } = network();
		service.axiosInstance.defaults.adapter = adapter;

		await service.axiosInstance.post('/timer/stop', {});

		expect(header(sent[0], 'Authorization')).toBe(`Bearer ${TOKEN_A}`);
		expect(header(sent[0], TAB_TEAM_HEADER)).toBeUndefined();
		expect(getOrganizationIdCookie()).toBe('org-a');
	});
});
