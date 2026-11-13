/**
 * `chatService.interact` as the request leaves the client: the click's `Idempotency-Key` header, the per-send
 * `timeout`, and a body that is the button only (no tenant or organization ids added by `APIService.post`), in direct
 * mode (the Gauzy API) and in proxy mode (this app's /api route, through the fallback client).
 */
import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

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
// Proxy mode: the request goes through the fallback client this app's /api routes answer.
const mockFallbackPost = jest.fn();
jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ axiosInstance: { post: (...args: unknown[]) => mockFallbackPost(...args) } })
}));

import { chatService } from './chat.service';

const ANSWER = {
	interaction: {
		interactionId: 'i-1',
		messageId: 'm1',
		conversationId: 'c1',
		actionId: 'ack',
		status: 'delivered',
		attempts: 1,
		replyApplied: false
	},
	events: []
};

/** The client's base URL, which decides the mode (none: proxy mode). */
function useBaseUrl(baseURL: string | undefined): void {
	(chatService as unknown as { baseURL?: string }).baseURL = baseURL;
}

describe('chatService.interact', () => {
	const original = (chatService as unknown as { baseURL?: string }).baseURL;
	afterEach(() => useBaseUrl(original));

	it('sends the key, the deadline and the button only, to the Gauzy API in direct mode', async () => {
		useBaseUrl('https://api.example.test');
		let sent: InternalAxiosRequestConfig | undefined;
		chatService.axiosInstance.defaults.adapter = async (config) => {
			sent = config;
			return { config, data: ANSWER, headers: {}, status: 200, statusText: 'OK' };
		};

		await expect(chatService.interact('m1', 'ack', 'alert-7', 'key-1', 15_000)).resolves.toEqual(ANSWER);

		expect(sent?.url).toBe('/chat/messages/m1/interactions');
		expect(sent?.method).toBe('post');
		expect(AxiosHeaders.from(sent?.headers as AxiosHeaders).get('Idempotency-Key')).toBe('key-1');
		expect(sent?.timeout).toBe(15_000);
		expect(JSON.parse(String(sent?.data))).toEqual({ actionId: 'ack', blockId: 'alert-7' });
		expect(mockFallbackPost).not.toHaveBeenCalled();
	});

	it('sends the same through the proxy route in proxy mode', async () => {
		useBaseUrl(undefined);
		mockFallbackPost.mockResolvedValue({ data: ANSWER, status: 200 });

		await expect(chatService.interact('m1', 'ack', null, 'key-1', 15_000)).resolves.toEqual(ANSWER);

		expect(mockFallbackPost).toHaveBeenCalledTimes(1);
		const [url, body, config] = mockFallbackPost.mock.calls[0] as [
			string,
			Record<string, unknown>,
			{ headers: Record<string, string>; timeout?: number }
		];
		expect(url).toBe('/chat/messages/m1/interactions');
		expect(body).toEqual({ actionId: 'ack' });
		expect(config.headers['Idempotency-Key']).toBe('key-1');
		expect(config.timeout).toBe(15_000);
	});

	it('sends no key and no deadline of its own for a caller that gives none', async () => {
		useBaseUrl(undefined);
		mockFallbackPost.mockResolvedValue({ data: ANSWER, status: 200 });

		await chatService.interact('m1', 'ack');

		const [, body, config] = mockFallbackPost.mock.calls[0] as [
			string,
			Record<string, unknown>,
			{ headers: Record<string, string>; timeout?: number }
		];
		expect(body).toEqual({ actionId: 'ack' });
		expect(config.headers).not.toHaveProperty('Idempotency-Key');
		expect(config.timeout).toBeUndefined();
	});
});
