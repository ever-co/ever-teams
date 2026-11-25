/**
 * #5735: the routing sets its language cookie to the language of every page it serves. A link prefetched in the
 * previous language, answered after the person picked another one, put the previous language back, and the links
 * that name no language then opened in it. A page that is only prefetched leaves that cookie alone.
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

// The i18n routing as it answers a German page: it sets its cookie to German
jest.mock('next-intl/middleware', () => ({
	__esModule: true,
	default: jest.fn(() =>
		jest.fn(() => {
			const response = NextResponse.next();
			response.cookies.set('NEXT_LOCALE', 'de', { path: '/', sameSite: 'lax' });
			return response;
		})
	)
}));
jest.mock('@/auth', () => ({ auth: jest.fn() }));

const SIGN_IN_PAGE = 'https://app.ever.team/de/auth/passcode';

function routingCookieOf(response: Response): string | undefined {
	return response.headers.getSetCookie().find((cookie) => cookie.startsWith('NEXT_LOCALE='));
}

describe('the language cookie of the routing', () => {
	beforeEach(() => {
		jest.spyOn(console, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('is not moved by a page that is only prefetched', async () => {
		const prefetch = new NextRequest(SIGN_IN_PAGE, {
			headers: { 'next-router-prefetch': '1', cookie: 'NEXT_LOCALE=fr' }
		});

		const response = await proxy(prefetch);

		expect(routingCookieOf(response)).toBeUndefined();
	});

	it('still follows a page the person opens', async () => {
		const visit = new NextRequest(SIGN_IN_PAGE, { headers: { cookie: 'NEXT_LOCALE=fr' } });

		const response = await proxy(visit);

		expect(routingCookieOf(response)).toContain('NEXT_LOCALE=de');
	});
});
