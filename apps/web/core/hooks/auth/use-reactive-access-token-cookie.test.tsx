/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

let accessToken: string | null = 'token-a';

jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => accessToken
}));

import { useReactiveAccessTokenCookie } from './use-reactive-access-token-cookie';

describe('useReactiveAccessTokenCookie', () => {
	beforeEach(() => {
		accessToken = 'token-a';
	});

	it('updates mounted request owners after a token rotation event', () => {
		const { result } = renderHook(() => useReactiveAccessTokenCookie());
		expect(result.current).toBe('token-a');

		act(() => {
			accessToken = 'token-b';
			window.dispatchEvent(new Event('ever-teams:access-token-refreshed'));
		});

		expect(result.current).toBe('token-b');
	});

	it('reconciles a middleware cookie rotation without a client refresh event', () => {
		jest.useFakeTimers();
		const view = renderHook(() => useReactiveAccessTokenCookie());
		expect(view.result.current).toBe('token-a');

		act(() => {
			accessToken = 'token-b';
			jest.advanceTimersByTime(5_000);
		});

		expect(view.result.current).toBe('token-b');
		view.unmount();
		jest.useRealTimers();
	});

	it('reconciles immediately when the browser becomes active again', () => {
		const { result } = renderHook(() => useReactiveAccessTokenCookie());
		expect(result.current).toBe('token-a');

		act(() => {
			accessToken = 'token-b';
			window.dispatchEvent(new Event('focus'));
		});

		expect(result.current).toBe('token-b');
	});
});
