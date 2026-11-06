/** @jest-environment jsdom */

const mockRemoveAuthCookies = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({ removeAuthCookies: () => mockRemoveAuthCookies() }));
jest.mock('@/core/query/config', () => ({ globalQueryClient: null }));
jest.mock('@/core/lib/auth/disconnect-logger', () => ({ logDisconnection: jest.fn() }));

import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { handleUnauthorized, resetUnauthorizedHandler } from './handle-unauthorized';

const originalLocation = window.location;

function openPage(pathname: string) {
	const assign = jest.fn();
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: { ...originalLocation, pathname, assign }
	});
	return assign;
}

describe('handleUnauthorized when the session has ended', () => {
	beforeEach(() => {
		mockRemoveAuthCookies.mockReset();
		resetUnauthorizedHandler();
	});

	afterAll(() => {
		Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
	});

	it('clears the session and sends the person to sign in from an app page', async () => {
		const assign = openPage('/settings/personal');

		await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);

		expect(mockRemoveAuthCookies).toHaveBeenCalled();
		expect(assign).toHaveBeenCalled();
	});

	it.each(['/auth/reset-password', '/fr/auth/forgot-password'])(
		'clears the session but stays on %s, so a reset link opened with an old session still works',
		async (pathname) => {
			const assign = openPage(pathname);

			await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);

			expect(mockRemoveAuthCookies).toHaveBeenCalled();
			expect(assign).not.toHaveBeenCalled();
		}
	);
});
