// cspell:ignore Fabrikam
/**
 * `embedsService` as the requests leave the client, in direct mode (the Gauzy API) and in proxy mode (this app's /api
 * routes, which hand the body on as it is): a credential for the whole workspace that adds no members is asked for
 * exactly as before credentials could be limited to a client, one for a client names it, and one that adds members
 * says so.
 */
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));
// Proxy mode: the requests go through the fallback client this app's /api routes answer.
const mockFallback = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() };
jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ axiosInstance: mockFallback })
}));

import { isSiteGrantsUnavailable } from '@/core/lib/utils/embed-site-grants';
import { EmbedClientNotLimitedError, EmbedMembersNotAddedError, embedsService } from './embeds.service';

const CREDENTIAL = {
	id: 'credential-1',
	name: 'Fabrikam client portal',
	prefix: 'gze_abcdefgh',
	organizationContactId: 'contact-fabrikam',
	createdAt: '2026-11-18T09:00:00.000Z',
	lastUsedAt: null
};
const CREATED = { ...CREDENTIAL, secret: 'gze_abcdefgh.secret' };

// The body every API has always taken: the name and the organization, in this order, nothing else
const WHOLE_WORKSPACE_BODY = '{"name":"Fabrikam client portal","organizationId":"organization-1"}';
const CLIENT_BODY =
	'{"name":"Fabrikam client portal","organizationId":"organization-1","organizationContactId":"contact-fabrikam"}';
const MEMBERS_BODY = '{"name":"Fabrikam client portal","organizationId":"organization-1","canAddMembers":true}';
const CLIENT_AND_MEMBERS_BODY =
	'{"name":"Fabrikam client portal","organizationId":"organization-1","organizationContactId":"contact-fabrikam","canAddMembers":true}';
const ADDING_MEMBERS = { ...CREATED, organizationContactId: null, canAddMembers: true };

// What POST /embed/authorize answers (ever-gauzy #12094): a timer token and its renewal token, made up for the tests
const SITE_TOKENS = {
	token: 'header.claims.signature',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_renewal-token',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};
// The organization and the exact origin, nothing else: the route takes no tenant or other field in its body
const AUTHORIZE_BODY = '{"organizationId":"organization-1","origin":"https://team.example.com"}';
const SITE = { id: 'origin-1', origin: 'https://team.example.com', allowPersonSignIn: true };
// What GET /embed/grants answers for each site the person allowed, made up for the tests
const SITE_GRANT = {
	id: 'grant-1',
	origin: 'https://team.example.com',
	organizationId: 'organization-1',
	userId: 'user-1',
	employeeId: 'employee-1',
	renewedAt: '2026-11-20T09:00:00.000Z',
	expiresAt: '2026-12-20T09:00:00.000Z'
};
const LISTED_SITE_GRANT = { id: 'grant-1', origin: 'https://team.example.com', expiresAt: '2026-12-20T09:00:00.000Z' };

/** The client's base URL, which decides the mode (none: proxy mode). */
function setBaseUrl(baseURL: string | undefined): void {
	(embedsService as unknown as { baseURL?: string }).baseURL = baseURL;
}

/** Direct mode: every request the client sends, answered with `data`. */
function directRequests(data: unknown): InternalAxiosRequestConfig[] {
	setBaseUrl('https://api.example.test');
	const sent: InternalAxiosRequestConfig[] = [];
	embedsService.axiosInstance.defaults.adapter = async (config) => {
		sent.push(config);
		return { config, data, headers: {}, status: 200, statusText: 'OK' };
	};
	return sent;
}

/** Direct mode: every request the client sends is refused with `status`, in Gauzy's error shape. */
function directRefusals(status: number): void {
	setBaseUrl('https://api.example.test');
	embedsService.axiosInstance.defaults.adapter = async (config) => {
		const response = {
			config,
			data: { statusCode: status, message: 'Refused' },
			headers: {},
			status,
			statusText: 'Refused'
		} as AxiosResponse;
		throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
	};
}

/** The error log of the client (`APIService.logError` hands every error it logs to it). */
function errorLog(): jest.Mock {
	return (embedsService as unknown as { httpLogger: { logError: jest.Mock } }).httpLogger.logError;
}

describe('embedsService', () => {
	const original = (embedsService as unknown as { baseURL?: string }).baseURL;
	afterEach(() => {
		setBaseUrl(original);
		jest.clearAllMocks();
	});

	describe('direct mode', () => {
		it('reads whether the API can limit a credential to a client, and an older API as unable to', async () => {
			directRequests({ enabled: true, clientLimits: true });
			await expect(embedsService.readConfig()).resolves.toEqual({
				enabled: true,
				clientLimits: true,
				addMembers: false
			});

			const sent = directRequests({ enabled: true });
			await expect(embedsService.readConfig()).resolves.toEqual({
				enabled: true,
				clientLimits: false,
				addMembers: false
			});
			expect(sent[0].url).toBe('/embed-credentials/config');
		});

		it('asks for a credential for the whole workspace exactly as before, the name trimmed', async () => {
			const sent = directRequests({ ...CREATED, organizationContactId: null });

			await embedsService.createCredential('organization-1', {
				name: ' Fabrikam client portal ',
				organizationContactId: null
			});

			expect(sent[0].method).toBe('post');
			expect(sent[0].url).toBe('/embed-credentials');
			expect(sent[0].data).toBe(WHOLE_WORKSPACE_BODY);
			expect((sent[0] as InternalAxiosRequestConfig & { secretResponse?: boolean }).secretResponse).toBe(true);
		});

		it('names the client a credential is limited to, and reads it back', async () => {
			const sent = directRequests(CREATED);

			const created = await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: 'contact-fabrikam'
			});

			expect(sent[0].data).toBe(CLIENT_BODY);
			expect(created.organizationContactId).toBe('contact-fabrikam');
		});

		it('revokes at once a credential the API made without the client it was asked for, and gives no secret', async () => {
			// An API that drops the field it does not know answers a credential for the whole workspace
			const withoutClient: Record<string, unknown> = { ...CREATED };
			delete withoutClient.organizationContactId;
			const sent = directRequests(withoutClient);

			const creating = embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: 'contact-fabrikam'
			});

			await expect(creating).rejects.toBeInstanceOf(EmbedClientNotLimitedError);
			await expect(creating).rejects.not.toHaveProperty('message', expect.stringContaining(CREATED.secret));
			expect(sent.map((config) => [config.method, config.url])).toEqual([
				['post', '/embed-credentials'],
				['delete', '/embed-credentials/credential-1']
			]);
		});

		it('still fails, without the secret, when that revocation fails too', async () => {
			const sent: InternalAxiosRequestConfig[] = [];
			setBaseUrl('https://api.example.test');
			embedsService.axiosInstance.defaults.adapter = async (config) => {
				sent.push(config);
				if (config.method === 'delete') {
					throw new Error('network down');
				}
				return {
					config,
					data: { ...CREATED, organizationContactId: null },
					headers: {},
					status: 201,
					statusText: ''
				};
			};

			await expect(
				embedsService.createCredential('organization-1', {
					name: 'Fabrikam client portal',
					organizationContactId: 'contact-fabrikam'
				})
			).rejects.toBeInstanceOf(EmbedClientNotLimitedError);
			expect(sent).toHaveLength(2);
		});

		it('asks the API to allow a site with the person’s session, and keeps the tokens out of the log', async () => {
			const sent = directRequests(SITE_TOKENS);

			const tokens = await embedsService.authorizeSite('organization-1', 'https://team.example.com');

			expect(tokens).toEqual(SITE_TOKENS);
			expect(sent[0].method).toBe('post');
			expect(sent[0].url).toBe('/embed/authorize');
			expect(sent[0].data).toBe(AUTHORIZE_BODY);
			expect((sent[0] as InternalAxiosRequestConfig & { secretResponse?: boolean }).secretResponse).toBe(true);
		});

		it('refuses an answer without both tokens, without quoting it', async () => {
			directRequests({ token: SITE_TOKENS.token, expiresAt: SITE_TOKENS.expiresAt });

			const authorizing = embedsService.authorizeSite('organization-1', 'https://team.example.com');

			await expect(authorizing).rejects.toThrow();
			await expect(authorizing).rejects.not.toHaveProperty('message', expect.stringContaining(SITE_TOKENS.token));
		});

		it('reads whether people can sign in from a site, and an older API as saying nothing', async () => {
			directRequests({ enabled: true, clientLimits: true, addMembers: true, personSignIn: true });
			await expect(embedsService.readConfig()).resolves.toHaveProperty('personSignIn', true);

			directRequests({ enabled: true });
			await expect(embedsService.readConfig()).resolves.not.toHaveProperty('personSignIn');
		});

		it('turns sign-in from a site on and off with its setting alone in the body', async () => {
			const sent = directRequests(SITE);

			const updated = await embedsService.setPersonSignIn('origin/1', true);

			expect(updated.allowPersonSignIn).toBe(true);
			expect(sent[0].method).toBe('patch');
			expect(sent[0].url).toBe('/embed-allowed-origins/origin%2F1');
			expect(sent[0].data).toBe('{"allowPersonSignIn":true}');

			directRequests({ ...SITE, allowPersonSignIn: false });
			await expect(embedsService.setPersonSignIn('origin-1', false)).resolves.toHaveProperty(
				'allowPersonSignIn',
				false
			);
		});

		it('lists each credential with its client', async () => {
			directRequests([CREDENTIAL, { ...CREDENTIAL, id: 'credential-2', organizationContactId: null }]);

			const credentials = await embedsService.listCredentials('organization-1');

			expect(credentials.map((credential) => credential.organizationContactId)).toEqual([
				'contact-fabrikam',
				null
			]);
		});

		it('reads whether the API lets a credential add members', async () => {
			directRequests({ enabled: true, clientLimits: true, addMembers: true });

			await expect(embedsService.readConfig()).resolves.toEqual({
				enabled: true,
				clientLimits: true,
				addMembers: true
			});
		});

		it('asks for a credential that adds no members exactly as before', async () => {
			const sent = directRequests({ ...CREATED, organizationContactId: null });

			await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: null,
				canAddMembers: false
			});

			expect(sent[0].data).toBe(WHOLE_WORKSPACE_BODY);
		});

		it('asks for a credential that adds members, and reads it back', async () => {
			const sent = directRequests(ADDING_MEMBERS);

			const created = await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: null,
				canAddMembers: true
			});

			expect(sent).toHaveLength(1);
			expect(sent[0].data).toBe(MEMBERS_BODY);
			expect(created.canAddMembers).toBe(true);
		});

		it('names the client beside the members option when both are asked for', async () => {
			const sent = directRequests({ ...CREATED, canAddMembers: true });

			await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: 'contact-fabrikam',
				canAddMembers: true
			});

			expect(sent[0].data).toBe(CLIENT_AND_MEMBERS_BODY);
		});

		it('revokes at once a credential the API made without letting it add members, and gives no secret', async () => {
			// An API that drops the field it does not know answers a credential that adds nobody
			const withoutMembers: Record<string, unknown> = { ...ADDING_MEMBERS };
			delete withoutMembers.canAddMembers;
			const sent = directRequests(withoutMembers);

			const creating = embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: null,
				canAddMembers: true
			});

			await expect(creating).rejects.toBeInstanceOf(EmbedMembersNotAddedError);
			await expect(creating).rejects.toHaveProperty('isRevoked', true);
			await expect(creating).rejects.not.toHaveProperty('message', expect.stringContaining(CREATED.secret));
			expect(sent.map((config) => [config.method, config.url])).toEqual([
				['post', '/embed-credentials'],
				['delete', '/embed-credentials/credential-1']
			]);
		});

		it('says the credential was not revoked, and still gives no secret, when that revocation fails', async () => {
			const sent: InternalAxiosRequestConfig[] = [];
			setBaseUrl('https://api.example.test');
			embedsService.axiosInstance.defaults.adapter = async (config) => {
				sent.push(config);
				if (config.method === 'delete') {
					throw new Error('network down');
				}
				return {
					config,
					data: { ...ADDING_MEMBERS, canAddMembers: false },
					headers: {},
					status: 201,
					statusText: ''
				};
			};

			const creating = embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: null,
				canAddMembers: true
			});

			await expect(creating).rejects.toBeInstanceOf(EmbedMembersNotAddedError);
			await expect(creating).rejects.toHaveProperty('isRevoked', false);
			await expect(creating).rejects.not.toHaveProperty('message', expect.stringContaining(CREATED.secret));
			expect(sent.map((config) => config.method)).toEqual(['post', 'delete']);
		});

		it('revokes once, and says the members option was dropped, when the API dropped the client too', async () => {
			// An older API drops both fields: a credential for the whole workspace that adds nobody
			const withNeither: Record<string, unknown> = { ...CREATED };
			delete withNeither.organizationContactId;
			const sent = directRequests(withNeither);

			const creating = embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: 'contact-fabrikam',
				canAddMembers: true
			});

			await expect(creating).rejects.toBeInstanceOf(EmbedMembersNotAddedError);
			await expect(creating).rejects.toHaveProperty('isRevoked', true);
			expect(sent[0].data).toBe(CLIENT_AND_MEMBERS_BODY);
			expect(sent.map((config) => [config.method, config.url])).toEqual([
				['post', '/embed-credentials'],
				['delete', '/embed-credentials/credential-1']
			]);
		});

		it('lists the sites the person signed in from, with no query, keeping only what the list shows', async () => {
			const sent = directRequests([SITE_GRANT]);

			const grants = await embedsService.listSiteGrants();

			expect(grants).toEqual([LISTED_SITE_GRANT]);
			expect(sent[0].method).toBe('get');
			expect(sent[0].url).toBe('/embed/grants');
		});

		it('fails the list of a Gauzy without the route with its 404, and keeps that 404 out of the error log', async () => {
			directRefusals(404);

			const error = await embedsService.listSiteGrants().then(
				() => null,
				(failure: unknown) => failure
			);

			expect(isSiteGrantsUnavailable(error)).toBe(true);
			expect(errorLog()).not.toHaveBeenCalled();
		});

		it('still logs a list read that failed with another status', async () => {
			directRefusals(500);

			await expect(embedsService.listSiteGrants()).rejects.toBeTruthy();

			expect(errorLog()).toHaveBeenCalledTimes(1);
			expect(errorLog().mock.calls[0][0].response.status).toBe(500);
		});

		it('ends the sign-in from a site by its id, kept as one path segment', async () => {
			const sent = directRequests(undefined);

			await embedsService.endSiteGrant('grant/../2');

			expect(sent[0].method).toBe('delete');
			expect(sent[0].url).toBe('/embed/grants/grant%2F..%2F2');
			expect(sent[0].data).toBeUndefined();
		});
	});

	describe('proxy mode', () => {
		beforeEach(() => setBaseUrl(undefined));

		it('sends the same bodies to this app’s /api route', async () => {
			mockFallback.get.mockResolvedValue({ data: { enabled: true, clientLimits: true }, status: 200 });
			mockFallback.post.mockResolvedValue({ data: CREATED, status: 201 });

			await expect(embedsService.readConfig()).resolves.toEqual({
				enabled: true,
				clientLimits: true,
				addMembers: false
			});
			await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: null
			});
			await embedsService.createCredential('organization-1', {
				name: 'Fabrikam client portal',
				organizationContactId: 'contact-fabrikam'
			});

			expect(mockFallback.get.mock.calls[0][0]).toBe('/embed-credentials/config');
			expect(mockFallback.post.mock.calls.map(([url]) => url)).toEqual([
				'/embed-credentials',
				'/embed-credentials'
			]);
			expect(mockFallback.post.mock.calls.map(([, body]) => JSON.stringify(body))).toEqual([
				WHOLE_WORKSPACE_BODY,
				CLIENT_BODY
			]);
			expect(mockFallback.post.mock.calls.map(([, , config]) => config.secretResponse)).toEqual([true, true]);
		});

		it('asks this app’s /api route to allow a site, with the same body, the answer kept out of the log', async () => {
			mockFallback.post.mockResolvedValue({ data: SITE_TOKENS, status: 200 });

			await expect(embedsService.authorizeSite('organization-1', 'https://team.example.com')).resolves.toEqual(
				SITE_TOKENS
			);

			const [[url, body, config]] = mockFallback.post.mock.calls;
			expect(url).toBe('/embed/authorize');
			expect(JSON.stringify(body)).toBe(AUTHORIZE_BODY);
			expect(config.secretResponse).toBe(true);
		});

		it('switches sign-in from a site through this app’s /api route', async () => {
			mockFallback.patch.mockResolvedValue({ data: SITE, status: 200 });

			await embedsService.setPersonSignIn('origin-1', true);

			const [[url, body]] = mockFallback.patch.mock.calls;
			expect(url).toBe('/embed-allowed-origins/origin-1');
			expect(JSON.stringify(body)).toBe('{"allowPersonSignIn":true}');
		});

		it('sends the members option to this app’s /api route, and revokes there a credential made without it', async () => {
			mockFallback.get.mockResolvedValue({
				data: { enabled: true, clientLimits: true, addMembers: true },
				status: 200
			});
			mockFallback.post.mockResolvedValueOnce({ data: ADDING_MEMBERS, status: 201 });
			mockFallback.post.mockResolvedValueOnce({ data: { ...ADDING_MEMBERS, canAddMembers: false }, status: 201 });
			mockFallback.delete.mockResolvedValue({ data: undefined, status: 200 });
			const input = { name: 'Fabrikam client portal', organizationContactId: null, canAddMembers: true };

			await expect(embedsService.readConfig()).resolves.toEqual({
				enabled: true,
				clientLimits: true,
				addMembers: true
			});
			await expect(embedsService.createCredential('organization-1', input)).resolves.toHaveProperty(
				'canAddMembers',
				true
			);
			await expect(embedsService.createCredential('organization-1', input)).rejects.toBeInstanceOf(
				EmbedMembersNotAddedError
			);

			expect(mockFallback.post.mock.calls.map(([, body]) => JSON.stringify(body))).toEqual([
				MEMBERS_BODY,
				MEMBERS_BODY
			]);
			expect(mockFallback.delete.mock.calls.map(([url]) => url)).toEqual(['/embed-credentials/credential-1']);
		});

		it('lists the sites the person signed in from, then ends one, through this app’s /api routes', async () => {
			mockFallback.get.mockResolvedValue({ data: [SITE_GRANT], status: 200 });
			mockFallback.delete.mockResolvedValue({ data: undefined, status: 204 });

			await expect(embedsService.listSiteGrants()).resolves.toEqual([LISTED_SITE_GRANT]);
			await embedsService.endSiteGrant('grant-1');

			expect(mockFallback.get.mock.calls[0][0]).toBe('/embed/grants');
			expect(mockFallback.delete.mock.calls[0][0]).toBe('/embed/grants/grant-1');
		});

		it('asks this app’s client to keep the 404 of a Gauzy without the route out of its error log', async () => {
			mockFallback.get.mockResolvedValue({ data: [], status: 200 });

			await embedsService.listSiteGrants();

			expect(mockFallback.get.mock.calls[0][1]).toEqual(expect.objectContaining({ quietStatuses: [404] }));
		});
	});
});
