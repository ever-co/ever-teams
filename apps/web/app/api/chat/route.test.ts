/**
 * POST /api/chat streams a completion from the provider the user configured. It is for signed-in users
 * only, and the custom (OpenAI-compatible) provider's base URL must be a public https endpoint, reached
 * through the guarded fetch: the server never POSTs to a loopback, cluster or private address for a
 * caller (SSRF). The built-in providers keep their fixed public endpoints.
 */
const mockAuthenticatedGuard = jest.fn();
const mockLookup = jest.fn();
const mockGuardedFetch = jest.fn();
const mockCreateGuardedFetch = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

jest.mock('node:dns/promises', () => ({
	lookup: (...args: unknown[]) => mockLookup(...args)
}));

// The guarded fetch is exercised against a real server in core/lib/chat/guarded-fetch.test.ts; here
// it stands in for the network so the test sees where the custom provider's request goes.
jest.mock('@/core/lib/chat/guarded-fetch', () => ({
	createGuardedFetch: (...args: unknown[]) => mockCreateGuardedFetch(...args)
}));

import { POST } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1', email: 'user@example.com' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-1',
	taskId: undefined,
	projectId: undefined
};

/** The guard's answer when Gauzy refuses the session (401) or cannot answer (503). */
function refused(status: number) {
	const message = status === 503 ? 'Session check unavailable, retry later' : 'Unauthorized';
	return {
		$res: (data: unknown) => Response.json({ statusCode: status, message: data }, { status }),
		user: null,
		status,
		deny: () => Response.json({ message }, { status })
	};
}

const originalFetch = global.fetch;
let globalFetch: jest.Mock;

/** An OpenAI chat-completions stream that answers `text`. */
function completionStream(text: string) {
	const chunk = (delta: object, finishReason: string | null) =>
		`data: ${JSON.stringify({
			id: 'completion-1',
			object: 'chat.completion.chunk',
			created: 1760000000,
			model: 'gpt-4o-mini',
			choices: [{ index: 0, delta, finish_reason: finishReason }]
		})}\n\n`;
	return new Response(`${chunk({ role: 'assistant', content: text }, null)}${chunk({}, 'stop')}data: [DONE]\n\n`, {
		status: 200,
		headers: { 'content-type': 'text/event-stream' }
	});
}

function chatRequest(config: Record<string, unknown> | undefined) {
	return new Request('https://app.ever.team/api/chat', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }], config })
	});
}

function resolvesTo(...addresses: string[]) {
	mockLookup.mockResolvedValue(addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })));
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	resolvesTo('93.184.215.14');
	mockGuardedFetch.mockImplementation(async () => completionStream('Hello'));
	mockCreateGuardedFetch.mockReturnValue(mockGuardedFetch);
	globalFetch = jest.fn(async () => completionStream('Hello'));
	global.fetch = globalFetch;
});

afterEach(() => {
	global.fetch = originalFetch;
});

describe('POST /api/chat', () => {
	it('answers 401 without a signed-in session, before calling any provider', async () => {
		mockAuthenticatedGuard.mockResolvedValue(refused(401));
		const request = chatRequest({ apiKey: 'sk-test', provider: 'custom', baseURL: 'https://api.example.com/v1' });

		const response = await POST(request);

		expect(response.status).toBe(401);
		expect(mockAuthenticatedGuard.mock.calls[0][0]).toBe(request);
		expect(globalFetch).not.toHaveBeenCalled();
		expect(mockCreateGuardedFetch).not.toHaveBeenCalled();
		expect(mockLookup).not.toHaveBeenCalled();
	});

	it('answers 503 when Gauzy could not check the session (not a sign-out), before calling any provider', async () => {
		mockAuthenticatedGuard.mockResolvedValue(refused(503));

		const response = await POST(
			chatRequest({ apiKey: 'sk-test', provider: 'custom', baseURL: 'https://api.example.com/v1' })
		);

		expect(response.status).toBe(503);
		expect(globalFetch).not.toHaveBeenCalled();
		expect(mockCreateGuardedFetch).not.toHaveBeenCalled();
	});

	it('stops the provider request when the caller goes away', async () => {
		const caller = new AbortController();
		const request = new Request('https://app.ever.team/api/chat', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'Hi' }],
				config: { apiKey: 'sk-test', provider: 'openai' }
			}),
			signal: caller.signal
		});

		const response = await POST(request);
		await response.text();
		const providerSignal = (globalFetch.mock.calls[0][1] as RequestInit).signal;
		caller.abort();

		expect(providerSignal?.aborted).toBe(true);
	});

	it('still asks a signed-in user for an API key', async () => {
		const response = await POST(chatRequest({ provider: 'openai' }));

		expect(response.status).toBe(400);
		expect(globalFetch).not.toHaveBeenCalled();
	});

	describe('custom provider', () => {
		it.each([
			['loopback over http', 'http://127.0.0.1:11434/v1'],
			['cloud metadata', 'https://169.254.169.254/latest/meta-data'],
			['a private address', 'https://10.0.0.12/v1'],
			['IPv6 loopback', 'https://[::1]/v1'],
			['localhost', 'https://localhost:11434/v1']
		])('rejects %s with 400 and sends nothing', async (_case, baseURL) => {
			const response = await POST(chatRequest({ apiKey: 'sk-test', provider: 'custom', model: 'm', baseURL }));

			expect(response.status).toBe(400);
			expect(globalFetch).not.toHaveBeenCalled();
			expect(mockGuardedFetch).not.toHaveBeenCalled();
		});

		it('rejects a host name that resolves to a cluster address with 400 and sends nothing', async () => {
			resolvesTo('10.43.0.10');

			const response = await POST(
				chatRequest({
					apiKey: 'sk-test',
					provider: 'custom',
					model: 'm',
					baseURL: 'https://ever-teams-api.ever-teams-prod.svc.cluster.local/v1'
				})
			);

			expect(response.status).toBe(400);
			expect(globalFetch).not.toHaveBeenCalled();
			expect(mockGuardedFetch).not.toHaveBeenCalled();
		});

		it('streams from a public https endpoint through the guarded fetch', async () => {
			const response = await POST(
				chatRequest({
					apiKey: 'sk-test',
					provider: 'custom',
					model: 'llama-3',
					baseURL: 'https://llm.example.com/v1/'
				})
			);

			expect(response.status).toBe(200);
			expect(await response.text()).toContain('0:"Hello"');
			expect(mockCreateGuardedFetch).toHaveBeenCalledWith({
				baseURL: 'https://llm.example.com/v1',
				allowLoopback: false
			});
			expect(mockGuardedFetch).toHaveBeenCalledTimes(1);
			expect(String(mockGuardedFetch.mock.calls[0][0])).toBe('https://llm.example.com/v1/chat/completions');
			expect(mockGuardedFetch.mock.calls[0][1]).toEqual(
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({ Authorization: 'Bearer sk-test' })
				})
			);
			expect(globalFetch).not.toHaveBeenCalled();
		});
	});

	describe('built-in providers are unchanged', () => {
		it.each([
			['openai', 'https://api.openai.com/v1/chat/completions'],
			['groq', 'https://api.groq.com/openai/v1/chat/completions'],
			['together', 'https://api.together.xyz/v1/chat/completions']
		])('%s streams from %s and ignores a base URL in the request', async (provider, endpoint) => {
			const response = await POST(
				chatRequest({ apiKey: 'sk-test', provider, model: 'm', baseURL: 'http://169.254.169.254/latest' })
			);

			expect(response.status).toBe(200);
			expect(await response.text()).toContain('0:"Hello"');
			expect(globalFetch).toHaveBeenCalledTimes(1);
			expect(String(globalFetch.mock.calls[0][0])).toBe(endpoint);
			expect(mockCreateGuardedFetch).not.toHaveBeenCalled();
			expect(mockLookup).not.toHaveBeenCalled();
		});
	});
});
