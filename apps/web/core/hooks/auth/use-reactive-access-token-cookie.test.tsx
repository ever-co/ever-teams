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
	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
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

	it('broadcasts a silent rotation after one of two subscribers rerenders first', () => {
		jest.useFakeTimers();
		const intervalSpy = jest.spyOn(window, 'setInterval');
		const first = renderHook(
			({ unrelated }) => {
				void unrelated;
				return useReactiveAccessTokenCookie();
			},
			{ initialProps: { unrelated: 0 } }
		);
		const second = renderHook(() => useReactiveAccessTokenCookie());
		expect(first.result.current).toBe('token-a');
		expect(second.result.current).toBe('token-a');
		expect(intervalSpy).toHaveBeenCalledTimes(1);

		accessToken = 'token-b';
		first.rerender({ unrelated: 1 });
		expect(first.result.current).toBe('token-b');
		expect(second.result.current).toBe('token-a');

		act(() => jest.advanceTimersByTime(1_000));

		expect(first.result.current).toBe('token-b');
		expect(second.result.current).toBe('token-b');
		first.unmount();
		second.unmount();
		intervalSpy.mockRestore();
		jest.useRealTimers();
	});

	it('keeps pageshow and Cookie Store reconciliation active', () => {
		jest.useFakeTimers();
		const cookieStore = new EventTarget();
		const cookieWindow = window as typeof window & { cookieStore?: EventTarget };
		Object.defineProperty(cookieWindow, 'cookieStore', { configurable: true, value: cookieStore });
		const view = renderHook(() => useReactiveAccessTokenCookie());

		act(() => {
			accessToken = 'token-b';
			window.dispatchEvent(new Event('pageshow'));
		});
		expect(view.result.current).toBe('token-b');

		act(() => {
			accessToken = 'token-c';
			cookieStore.dispatchEvent(new Event('change'));
			jest.advanceTimersByTime(0);
		});
		expect(view.result.current).toBe('token-c');

		view.unmount();
		delete cookieWindow.cookieStore;
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
