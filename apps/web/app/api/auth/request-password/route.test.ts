/**
 * The proxy-mode route behind "e-mail me a password reset link". The link has to open this app's own page,
 * `/auth/reset-password`, which takes the link's `?token=`: Gauzy's own route, `<client>/#/auth/reset-password`, is
 * not a page of this app. So the route names the page to Gauzy, on the app's configured public origin.
 */
const mockRequestPasswordRequest = jest.fn();
const mockAppPublicOrigin = jest.fn();

jest.mock('@/core/services/server/requests', () => ({
	requestPasswordRequest: (...args: unknown[]) => mockRequestPasswordRequest(...args)
}));
jest.mock('@/core/services/server/requests/account-deletion', () => ({
	appPublicOrigin: () => mockAppPublicOrigin()
}));

import { POST } from './route';

function ask(body: unknown, url = 'http://0.0.0.0:3030/api/auth/request-password') {
	return POST(new Request(url, { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/auth/request-password', () => {
	it("names this app's reset page on the configured origin, not on the address the request reached", async () => {
		mockAppPublicOrigin.mockReturnValue('https://teams.example.org');
		mockRequestPasswordRequest.mockResolvedValue({ data: true });

		const res = await ask({ email: 'ada@example.org' });

		expect(mockRequestPasswordRequest).toHaveBeenCalledWith(
			'ada@example.org',
			'https://teams.example.org/auth/reset-password'
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toBe(true);
	});

	it('uses the origin of the request when no public origin is configured', async () => {
		mockAppPublicOrigin.mockReturnValue(null);
		mockRequestPasswordRequest.mockResolvedValue({ data: true });

		await ask({ email: 'ada@example.org' }, 'https://teams.example.org/api/auth/request-password');

		expect(mockRequestPasswordRequest).toHaveBeenCalledWith(
			'ada@example.org',
			'https://teams.example.org/auth/reset-password'
		);
	});

	it.each([
		['an address that is not one', { email: 'not-an-address' }],
		['no address', {}]
	])('refuses %s without asking Gauzy', async (_case, body) => {
		const res = await ask(body);

		expect(res.status).toBe(400);
		expect(mockRequestPasswordRequest).not.toHaveBeenCalled();
	});
});
