// cspell:ignore Fabrikam
/**
 * `embedsService` as the requests leave the client, in direct mode (the Gauzy API) and in proxy mode (this app's /api
 * routes, which hand the body on as it is): a credential for the whole workspace is asked for exactly as before
 * credentials could be limited to a client, and one for a client names it.
 */
import { InternalAxiosRequestConfig } from 'axios';

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
const mockFallback = { get: jest.fn(), post: jest.fn() };
jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ axiosInstance: mockFallback })
}));

import { EmbedClientNotLimitedError, embedsService } from './embeds.service';

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

describe('embedsService', () => {
	const original = (embedsService as unknown as { baseURL?: string }).baseURL;
	afterEach(() => {
		setBaseUrl(original);
		jest.clearAllMocks();
	});

	describe('direct mode', () => {
		it('reads whether the API can limit a credential to a client, and an older API as unable to', async () => {
			directRequests({ enabled: true, clientLimits: true });
			await expect(embedsService.readConfig()).resolves.toEqual({ enabled: true, clientLimits: true });

			const sent = directRequests({ enabled: true });
			await expect(embedsService.readConfig()).resolves.toEqual({ enabled: true, clientLimits: false });
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

		it('lists each credential with its client', async () => {
			directRequests([CREDENTIAL, { ...CREDENTIAL, id: 'credential-2', organizationContactId: null }]);

			const credentials = await embedsService.listCredentials('organization-1');

			expect(credentials.map((credential) => credential.organizationContactId)).toEqual([
				'contact-fabrikam',
				null
			]);
		});
	});

	describe('proxy mode', () => {
		beforeEach(() => setBaseUrl(undefined));

		it('sends the same bodies to this app’s /api route', async () => {
			mockFallback.get.mockResolvedValue({ data: { enabled: true, clientLimits: true }, status: 200 });
			mockFallback.post.mockResolvedValue({ data: CREATED, status: 201 });

			await expect(embedsService.readConfig()).resolves.toEqual({ enabled: true, clientLimits: true });
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
	});
});
