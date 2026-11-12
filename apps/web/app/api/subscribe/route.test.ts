/**
 * `POST /api/subscribe` put any address on the operator's Mailchimp list as `subscribed`, for anyone, with tags of
 * the caller's choosing (the captcha it asked for was never checked). It now needs a signed-in user; only the user's
 * own address is subscribed outright, any other is `pending` (Mailchimp asks its owner to confirm), and the tags are
 * the app's.
 */
const mockGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockGuard(...args)
}));

import { APP_NAME } from '@/core/constants/config/constants';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/subscribe', () => {
	const env = { ...process.env };
	const fetchMock = jest.fn();
	const realFetch = global.fetch;

	beforeEach(() => {
		process.env.MAILCHIMP_LIST_ID = 'list-1';
		process.env.MAILCHIMP_API_KEY = 'key-us3';
		mockGuard.mockResolvedValue({ user: { id: 'user-1', email: 'Ada@Example.com', isEmailVerified: true } });
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'member' }), { status: 200 }));
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		process.env = { ...env };
		global.fetch = realFetch;
	});

	const post = (body: unknown) =>
		POST(
			new NextRequest('http://localhost/api/subscribe', {
				method: 'POST',
				body: typeof body === 'string' ? body : JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' }
			})
		);
	/** What the route asked Mailchimp to store. */
	const member = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

	it('refuses a caller who is not signed in, and calls Mailchimp for nothing', async () => {
		mockGuard.mockResolvedValue({ user: null, status: 401 });

		const response = await post({ email_address: 'victim@example.com' });

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("subscribes the signed-in user's own address outright", async () => {
		const response = await post({ email_address: 'ada@example.com' });

		expect(response.status).toBe(201);
		expect(fetchMock.mock.calls[0][0]).toBe('https://us3.api.mailchimp.com/3.0/lists/list-1/members');
		expect(member()).toEqual({
			email_address: 'ada@example.com',
			status: 'subscribed',
			tags: [`${APP_NAME}, ${APP_NAME} App`, 'Open', 'Cloud']
		});
	});

	it.each([
		['not verified', false],
		['of unknown verification', undefined]
	])("leaves the user's own address pending while it is %s", async (_label, isEmailVerified) => {
		// Registration signs the user in before the address is confirmed, so the account proves nothing yet
		mockGuard.mockResolvedValue({ user: { id: 'user-1', email: 'Ada@Example.com', isEmailVerified } });

		await post({ email_address: 'ada@example.com' });

		expect(member()).toMatchObject({ email_address: 'ada@example.com', status: 'pending' });
	});

	it("leaves anyone else's address pending until its owner confirms, whatever the body asks for", async () => {
		await post({
			email_address: 'victim@example.com',
			status: 'subscribed',
			tags: ['vip-automation'],
			captcha: ''
		});

		expect(member()).toEqual({
			email_address: 'victim@example.com',
			status: 'pending',
			tags: [`${APP_NAME}, ${APP_NAME} App`, 'Open', 'Cloud']
		});
	});

	it.each([
		['no address', {}],
		['an address that is not one', { email_address: 'not-an-email' }],
		['a body that is not JSON', 'email_address=victim@example.com']
	])('answers 400 for %s', async (_label, body) => {
		const response = await post(body);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	/**
	 * #5097: nothing recorded the subscription, so the opt-in card came back on every page, browser and device. The
	 * route keeps it on the user, in their UI preferences on the platform, once Mailchimp took the address.
	 */
	describe('keeping the subscription on the user (#5097)', () => {
		const answer = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });
		/** The route's call to the platform, if it made one. */
		const platformCall = () =>
			fetchMock.mock.calls.find(([url]) => String(url).endsWith('/user/ui-preferences')) as
				| [string, RequestInit & { headers: Record<string, string> }]
				| undefined;

		beforeEach(() => {
			mockGuard.mockResolvedValue({
				user: { id: 'user-1', email: 'Ada@Example.com', isEmailVerified: true },
				access_token: 'token-1',
				tenantId: 'tenant-1'
			});
			fetchMock.mockImplementation(async () => answer({ id: 'member' }, 200));
		});

		it('keeps it once Mailchimp took the address, as the signed-in user, and answers it', async () => {
			const response = await post({ email_address: 'ada@example.com' });

			expect(response.status).toBe(201);
			const [, init] = platformCall()!;
			expect(init.method).toBe('PUT');
			expect(init.headers).toMatchObject({ authorization: 'Bearer token-1', 'tenant-id': 'tenant-1' });
			const kept = JSON.parse(init.body as string);
			expect(kept).toEqual({ newsletter: { subscribedAt: expect.any(String), status: 'subscribed' } });
			expect((await response.json()).newsletter).toEqual(kept.newsletter);
		});

		it('keeps an address that is not the verified one as pending', async () => {
			await post({ email_address: 'someone@example.com' });

			expect(JSON.parse(platformCall()![1].body as string).newsletter.status).toBe('pending');
		});

		it('counts an address Mailchimp already holds as subscribed', async () => {
			fetchMock.mockResolvedValueOnce(answer({ title: 'Member Exists', detail: 'already a list member' }, 400));

			const response = await post({ email_address: 'ada@example.com' });

			expect(response.status).toBe(201);
			expect((await response.json()).status).toBe('subscribed');
			expect(platformCall()).toBeDefined();
		});

		it('keeps nothing when Mailchimp refuses the address', async () => {
			fetchMock.mockResolvedValueOnce(answer({ title: 'Invalid Resource', detail: 'looks fake' }, 400));

			const response = await post({ email_address: 'ada@example.com' });

			expect(response.status).toBe(400);
			expect(platformCall()).toBeUndefined();
		});

		it('still answers the subscription when the platform cannot keep it, since the address is on the list', async () => {
			jest.spyOn(console, 'error').mockImplementation(() => undefined);
			fetchMock.mockImplementation(async (url: string) =>
				String(url).endsWith('/user/ui-preferences')
					? answer({ message: 'unavailable' }, 503)
					: answer({ id: 'member' }, 200)
			);

			const response = await post({ email_address: 'ada@example.com' });

			expect(response.status).toBe(201);
			expect((await response.json()).newsletter).toMatchObject({ status: 'subscribed' });
		});
	});
});
