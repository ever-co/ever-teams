/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

let pathname = '/auth/login';
let accessToken: string | undefined;

jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => accessToken,
	getRefreshTokenCookie: () => 'refresh-token',
	setAccessTokenCookie: jest.fn(),
	setRefreshTokenCookie: jest.fn()
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { refreshTokenRaw: jest.fn() }
}));
jest.mock('@/core/lib/auth/jwt-utils', () => ({
	shouldRefreshToken: () => false,
	getTokenRemainingTime: () => 3600,
	getTokenLifetime: () => 7200,
	formatRemainingTime: (value: number) => String(value),
	calculateRefreshInterval: () => 10_000
}));
jest.mock('@/core/constants/config/constants', () => ({ INIT_DELAY_MS: 10 }));

import { useProactiveTokenRefresh } from './use-proactive-token-refresh';

describe('useProactiveTokenRefresh scheduler ownership', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		pathname = '/auth/login';
		accessToken = undefined;
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it('starts one scheduler when login navigation makes a token available', async () => {
		const timeoutSpy = jest.spyOn(window, 'setTimeout');
		const { rerender, unmount } = renderHook(() => useProactiveTokenRefresh());
		await act(async () => jest.advanceTimersByTime(10));
		expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 10_000)).toHaveLength(0);

		accessToken = 'access-token';
		pathname = '/';
		rerender();
		await act(async () => jest.advanceTimersByTime(10));
		expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 10_000)).toHaveLength(1);

		pathname = '/dashboard';
		rerender();
		await act(async () => jest.advanceTimersByTime(10));
		expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 10_000)).toHaveLength(2);

		unmount();
		expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
	});
});
