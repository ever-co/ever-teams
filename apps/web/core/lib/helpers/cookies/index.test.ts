/** @jest-environment jsdom */

import { TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { deleteCookieCrossSite, getCookie, setCookie } from './helpers';
import { ACCESS_TOKEN_REFRESHED_EVENT, setAccessTokenCookie } from './index';

jest.mock('./helpers', () => ({
	deleteCookie: jest.fn(),
	deleteCookieCrossSite: jest.fn(),
	getCookie: jest.fn(),
	setCookie: jest.fn()
}));

describe('setAccessTokenCookie refresh notification', () => {
	const mockedGetCookie = jest.mocked(getCookie);
	const mockedSetCookie = jest.mocked(setCookie);
	const mockedDeleteCookieCrossSite = jest.mocked(deleteCookieCrossSite);

	beforeEach(() => {
		jest.clearAllMocks();
		mockedGetCookie.mockReturnValue(undefined);
	});

	it('notifies browser consumers exactly once after replacing a regular token', () => {
		const listener = jest.fn();
		window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);

		setAccessTokenCookie('new-access-token');

		expect(mockedSetCookie).toHaveBeenCalledWith(TOKEN_COOKIE_NAME, 'new-access-token', undefined, true);
		expect(listener).toHaveBeenCalledTimes(1);
		window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);
	});

	it('notifies browser consumers once after replacing a chunked token', () => {
		const listener = jest.fn();
		window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);

		setAccessTokenCookie('x'.repeat(4097));

		expect(mockedSetCookie).toHaveBeenCalledWith(`${TOKEN_COOKIE_NAME}_totalChunks`, '2', undefined, true);
		expect(listener).toHaveBeenCalledTimes(1);
		window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);
	});

	it('does not emit a browser event for a server-side cookie write', () => {
		const listener = jest.fn();
		const ctx = { req: {}, res: {} };
		window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);

		setAccessTokenCookie('server-access-token', ctx);

		expect(mockedDeleteCookieCrossSite).toHaveBeenCalledWith(TOKEN_COOKIE_NAME, ctx);
		expect(listener).not.toHaveBeenCalled();
		window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, listener);
	});
});
