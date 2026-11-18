import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import type * as TabButtons from './use-tab-buttons-loading';

/** A new start of the app, with its own wait: the module of the hook loads again, with the same React. */
function startTheApp(): typeof TabButtons.useTabButtonsLoading {
	jest.resetModules();
	jest.doMock('react', () => React);
	const tabButtons: typeof TabButtons = jest.requireActual('./use-tab-buttons-loading');
	return tabButtons.useTabButtonsLoading;
}

describe('the tab buttons', () => {
	it('wait for the first screens once, and not when the navigator mounts again for a new language', async () => {
		const useTabButtonsLoading = startTheApp();
		const first = await renderHook(() => useTabButtonsLoading());
		expect(first.result.current).toBe(true);

		await act(async () => {
			jest.advanceTimersByTime(3000);
		});
		expect(first.result.current).toBe(false);
		await first.unmount();

		const again = await renderHook(() => useTabButtonsLoading());
		expect(again.result.current).toBe(false);
	});

	it('keep the first deadline when the navigator leaves before it and comes back', async () => {
		const useTabButtonsLoading = startTheApp();
		const first = await renderHook(() => useTabButtonsLoading());
		await act(async () => {
			jest.advanceTimersByTime(1000);
		});
		await first.unmount();
		// The wait goes on while the navigator is away
		jest.advanceTimersByTime(1500);

		const early = await renderHook(() => useTabButtonsLoading());
		expect(early.result.current).toBe(true);
		await act(async () => {
			jest.advanceTimersByTime(499);
		});
		expect(early.result.current).toBe(true);
		await act(async () => {
			jest.advanceTimersByTime(1);
		});
		expect(early.result.current).toBe(false);
		await early.unmount();

		const late = await renderHook(() => useTabButtonsLoading());
		expect(late.result.current).toBe(false);
	});

	it('stay shown when the phone clock moves back after the wait', async () => {
		const useTabButtonsLoading = startTheApp();
		const first = await renderHook(() => useTabButtonsLoading());
		await act(async () => {
			jest.advanceTimersByTime(3000);
		});
		await first.unmount();

		jest.setSystemTime(Date.now() - 60_000);
		const again = await renderHook(() => useTabButtonsLoading());
		expect(again.result.current).toBe(false);
	});
});
