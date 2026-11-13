/**
 * `chatWebhooksService` as the requests leave the client: the platform's management routes of a channel's incoming
 * webhooks, with bodies that hold the webhook's fields only (no tenant or organization ids added by `APIService`), in
 * direct mode (the Gauzy API) and in proxy mode (this app's /api routes, through the fallback client).
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
const mockFallback = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() };
jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ axiosInstance: mockFallback })
}));

import { chatWebhooksService } from './chat-webhooks.service';

const WEBHOOK = {
	id: 'w1',
	conversationId: 'c1',
	name: 'Alerts',
	tokenHint: 'ab12',
	hasSigningSecret: true,
	canBroadcast: false,
	acceptedCount: 0,
	rejectedCount: 0,
	rateLimitedCount: 0,
	callbackFailureCount: 0
};
const CREATED = {
	webhook: WEBHOOK,
	url: 'https://api.example.test/api/chat/hooks/hook_url-secret',
	signingSecret: 'signing-secret-1'
};

/** The client's base URL, which decides the mode (none: proxy mode). */
function setBaseUrl(baseURL: string | undefined): void {
	(chatWebhooksService as unknown as { baseURL?: string }).baseURL = baseURL;
}

/** Direct mode: every request the client sends, answered with `data`. */
function directRequests(data: unknown): InternalAxiosRequestConfig[] {
	setBaseUrl('https://api.example.test');
	const sent: InternalAxiosRequestConfig[] = [];
	chatWebhooksService.axiosInstance.defaults.adapter = async (config) => {
		sent.push(config);
		return { config, data, headers: {}, status: 200, statusText: 'OK' };
	};
	return sent;
}

const bodyOf = (config: InternalAxiosRequestConfig | undefined) =>
	config?.data === undefined ? undefined : JSON.parse(String(config.data));

describe('chatWebhooksService', () => {
	const original = (chatWebhooksService as unknown as { baseURL?: string }).baseURL;
	afterEach(() => {
		setBaseUrl(original);
		jest.clearAllMocks();
	});

	describe('direct mode', () => {
		it('lists a channel’s webhooks', async () => {
			const sent = directRequests([WEBHOOK]);

			await expect(chatWebhooksService.list('c1')).resolves.toEqual([WEBHOOK]);

			expect(sent[0].method).toBe('get');
			expect(sent[0].url).toBe('/chat/conversations/c1/webhooks');
		});

		it('creates one with its fields only, and answers its URL and signing secret', async () => {
			const sent = directRequests(CREATED);

			await expect(
				chatWebhooksService.create('c1', {
					name: 'Alerts',
					iconUrl: null,
					interactionUrl: null,
					canBroadcast: false
				})
			).resolves.toEqual(CREATED);

			expect(sent[0].method).toBe('post');
			expect(sent[0].url).toBe('/chat/conversations/c1/webhooks');
			expect(bodyOf(sent[0])).toEqual({
				name: 'Alerts',
				iconUrl: null,
				interactionUrl: null,
				canBroadcast: false
			});
		});

		it('changes the fields named only, with no tenant or organization ids', async () => {
			const sent = directRequests({ webhook: { ...WEBHOOK, name: 'Ops' } });

			await chatWebhooksService.update('w1', { name: 'Ops', interactionUrl: null });

			expect(sent[0].method).toBe('patch');
			expect(sent[0].url).toBe('/chat/webhooks/w1');
			expect(bodyOf(sent[0])).toEqual({ name: 'Ops', interactionUrl: null });
		});

		it('asks a new signing secret and revokes, by the webhook’s id', async () => {
			const sent = directRequests({ webhook: WEBHOOK, signingSecret: 'signing-secret-2' });

			await chatWebhooksService.rotateSecret('w1');
			await chatWebhooksService.revoke('w1');

			expect([sent[0].method, sent[0].url]).toEqual(['post', '/chat/webhooks/w1/secret']);
			expect(bodyOf(sent[0])).toEqual({});
			expect([sent[1].method, sent[1].url]).toEqual(['delete', '/chat/webhooks/w1']);
		});

		it('keeps an id one path segment', async () => {
			const sent = directRequests([]);

			await chatWebhooksService.list('../x');
			await chatWebhooksService.revoke('../w1');

			expect(sent[0].url).toBe('/chat/conversations/..%2Fx/webhooks');
			expect(sent[1].url).toBe('/chat/webhooks/..%2Fw1');
		});
	});

	describe('proxy mode', () => {
		beforeEach(() => setBaseUrl(undefined));

		it('sends the same requests to this app’s /api routes', async () => {
			mockFallback.get.mockResolvedValue({ data: [WEBHOOK], status: 200 });
			mockFallback.post.mockResolvedValue({ data: CREATED, status: 201 });
			mockFallback.patch.mockResolvedValue({ data: { webhook: WEBHOOK }, status: 200 });
			mockFallback.delete.mockResolvedValue({ data: { webhook: WEBHOOK }, status: 200 });

			await chatWebhooksService.list('c1');
			await chatWebhooksService.create('c1', { name: 'Alerts' });
			await chatWebhooksService.update('w1', { canBroadcast: true });
			await chatWebhooksService.rotateSecret('w1');
			await chatWebhooksService.revoke('w1');

			expect(mockFallback.get.mock.calls[0][0]).toBe('/chat/conversations/c1/webhooks');
			expect(mockFallback.post.mock.calls.map(([url, body]) => [url, body])).toEqual([
				['/chat/conversations/c1/webhooks', { name: 'Alerts' }],
				['/chat/webhooks/w1/secret', {}]
			]);
			expect(mockFallback.patch.mock.calls[0].slice(0, 2)).toEqual(['/chat/webhooks/w1', { canBroadcast: true }]);
			expect(mockFallback.delete.mock.calls[0][0]).toBe('/chat/webhooks/w1');
		});
	});
});
