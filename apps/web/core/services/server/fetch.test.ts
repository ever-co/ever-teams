// cspell:ignore KHTML
/**
 * serverFetch rejects a non-2xx answer with a rejected promise that holds Gauzy's error body (callers read it with
 * unwrapRejection). That inner promise must be marked handled, or every such answer is also an unhandled rejection
 * (each sign-in's /invite/validate-by-code 400, for one).
 */
import { clientAppHeaders, serverFetch, unwrapRejection } from './fetch';

/** The headers of the browser request this server is handling, or none outside a request. */
let mockRequestHeaders: Headers | null = null;

jest.mock('next/headers', () => ({
	headers: async () => {
		if (!mockRequestHeaders) {
			throw new Error('`headers` was called outside a request scope');
		}
		return mockRequestHeaders;
	}
}));

describe("serverFetch and the browser's user agent (ever-co/ever-gauzy#11983)", () => {
	const realFetch = global.fetch;
	const CHROME =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
	let sent: jest.Mock<Promise<Response>, [string, RequestInit?]>;

	const userAgentSent = () => (sent.mock.calls[0][1]?.headers as Record<string, string>)['User-Agent'];

	beforeEach(() => {
		sent = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => new Response('{}', { status: 200 }));
		global.fetch = sent as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = realFetch;
		mockRequestHeaders = null;
	});

	it('sends the user agent of the browser this server is answering, on a call that signs a session in or renews it', async () => {
		mockRequestHeaders = new Headers({ 'user-agent': CHROME });

		await serverFetch({ path: '/auth/refresh-token', method: 'POST', body: {}, browserUserAgent: true });

		expect(userAgentSent()).toBe(CHROME);
	});

	it('sends the user agent it is given where no request is at hand, as in the proxy', async () => {
		await serverFetch({ path: '/auth/refresh-token', method: 'POST', body: {}, browserUserAgent: CHROME });

		expect(userAgentSent()).toBe(CHROME);
	});

	it("leaves any other call with this server's own", async () => {
		mockRequestHeaders = new Headers({ 'user-agent': CHROME });

		await serverFetch({ path: '/user/me', method: 'GET' });

		expect(userAgentSent()).toBeUndefined();
	});

	it('sends none outside a request, nor one a header cannot carry', async () => {
		await serverFetch({ path: '/auth/refresh-token', method: 'POST', body: {}, browserUserAgent: true });
		await serverFetch({ path: '/auth/refresh-token', method: 'POST', body: {}, browserUserAgent: 'Browser 漢字' });

		expect(sent.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)['User-Agent'])).toEqual([
			undefined,
			undefined
		]);
	});
});

describe('serverFetch names this app to Gauzy (ever-co/ever-gauzy#11983)', () => {
	const realFetch = global.fetch;

	afterEach(() => {
		global.fetch = realFetch;
	});

	it("sends the app's name, which Gauzy records with a session it signs in or renews", async () => {
		const sent = jest.fn<Promise<Response>, [string, RequestInit?]>(
			async () => new Response('{}', { status: 200 })
		);
		global.fetch = sent as unknown as typeof fetch;

		await serverFetch({ path: '/auth/refresh-token', method: 'POST', body: { refresh_token: 'refresh' } });

		expect(sent.mock.calls[0][1]?.headers).toMatchObject({ 'X-Client-App': 'Ever Teams' });
	});

	it('sends no name a header cannot carry, so that a renamed app keeps every call working', () => {
		expect(clientAppHeaders('Acme Time')).toEqual({ 'X-Client-App': 'Acme Time' });
		expect(clientAppHeaders('团队时间')).toEqual({});
		expect(clientAppHeaders('x'.repeat(65))).toEqual({});
		expect(clientAppHeaders('   ')).toEqual({});
	});
});

describe('serverFetch on a non-2xx answer', () => {
	const realFetch = global.fetch;

	beforeEach(() => {
		global.fetch = jest.fn(
			async () => new Response(JSON.stringify({ statusCode: 400, message: 'bad code' }), { status: 400 })
		) as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = realFetch;
	});

	it("rejects with Gauzy's error body, which unwrapRejection reads", async () => {
		// try/catch, not .catch((e) => e): returning the rejected promise from a handler would adopt it
		let error: unknown;
		try {
			await serverFetch({ path: '/invite/validate-by-code', method: 'POST', body: {} });
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(Promise);
		expect(await unwrapRejection(error)).toEqual({ statusCode: 400, message: 'bad code' });
	});

	it('leaves no unhandled rejection behind', async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);
		try {
			await serverFetch({ path: '/invite/validate-by-code', method: 'POST', body: {} }).catch(() => undefined);
			// Node reports unhandled rejections after the microtask queue drains
			await new Promise((resolve) => setTimeout(resolve, 10));
		} finally {
			process.off('unhandledRejection', onUnhandled);
		}

		expect(unhandled).toEqual([]);
	});
});

describe('serverFetch with keepsStatusOnError', () => {
	const realFetch = global.fetch;

	afterEach(() => {
		global.fetch = realFetch;
	});

	async function rejectionOf(answer: Response, keepsStatusOnError?: boolean) {
		global.fetch = jest.fn(async () => answer) as unknown as typeof fetch;
		let error: unknown;
		try {
			await serverFetch({ path: '/tags/bulk', method: 'POST', body: {}, keepsStatusOnError });
		} catch (caught) {
			error = caught;
		}
		return unwrapRejection(error);
	}

	it('gives the HTTP status of an error answer whose body has none', async () => {
		await expect(
			rejectionOf(new Response(null, { status: 405, statusText: 'Method Not Allowed' }), true)
		).resolves.toEqual({
			statusCode: 405,
			message: 'Method Not Allowed'
		});
		await expect(
			rejectionOf(new Response('Not Found', { status: 404, statusText: 'Not Found' }), true)
		).resolves.toEqual({
			statusCode: 404,
			message: 'Not Found'
		});
	});

	it("keeps Gauzy's own error body as it is", async () => {
		const body = { statusCode: 404, message: 'Cannot POST /api/tags/bulk', error: 'Not Found' };

		await expect(rejectionOf(Response.json(body, { status: 404 }), true)).resolves.toEqual(body);
	});

	it('changes nothing for the callers that do not ask for it', async () => {
		await expect(rejectionOf(new Response(null, { status: 405 }))).resolves.toBeUndefined();
	});
});
