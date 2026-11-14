/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
	DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY,
	KEPT_TIME_ZONE_PAIR_STORAGE_KEY
} from '@/core/lib/utils/time-zone-notice';
import type { useTimeZoneNotice as UseTimeZoneNotice } from './use-time-zone-notice';

let mockUser: { id: string; timeZone: string | null } | undefined;
let mockBrowserZone = 'America/New_York';
const mockSaveZone = jest.fn<Promise<boolean>, [string]>();

jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/settings/use-time-zone-setting', () => ({
	useTimeZoneSetting: () => ({ saveZone: mockSaveZone, isSaving: false })
}));
jest.mock('@/core/lib/utils/settings-time-zone', () => ({
	...jest.requireActual('@/core/lib/utils/settings-time-zone'),
	detectTimeZone: () => mockBrowserZone
}));

const PAIR = 'Africa/Kinshasa|America/New_York';

/** A fresh copy of the hook's module (what a page load starts from), on the same React as the renderer. */
function freshHook(): typeof UseTimeZoneNotice {
	let hook: typeof UseTimeZoneNotice | undefined;
	jest.isolateModules(() => {
		jest.doMock('react', () => React);
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		hook = require('./use-time-zone-notice').useTimeZoneNotice;
	});
	if (!hook) {
		throw new Error('hook not loaded');
	}
	return hook;
}

async function renderNotice() {
	const useNotice = freshHook();
	const rendered = renderHook(() => useNotice());
	await waitFor(() => expect(rendered.result.current.notice).not.toBeNull());
	return rendered;
}

beforeEach(() => {
	mockUser = { id: 'user-1', timeZone: 'Africa/Kinshasa (UTC +01:00)' };
	mockSaveZone.mockReset();
	mockBrowserZone = 'America/New_York';
	window.localStorage.clear();
	window.sessionStorage.clear();
});

describe('useTimeZoneNotice', () => {
	it('says nothing before the user is known', async () => {
		mockUser = undefined;
		const useNotice = freshHook();

		const { result } = renderHook(() => useNotice());

		await waitFor(() => expect(result.current.notice).toBeNull());
	});

	it('offers the browser zone, and stays gone once it is saved', async () => {
		mockSaveZone.mockResolvedValue(true);
		const { result } = await renderNotice();

		await act(() => result.current.adoptBrowserZone());

		expect(mockSaveZone).toHaveBeenCalledWith('America/New_York');
		expect(result.current.notice).toBeNull();
		expect(result.current.hasFailed).toBe(false);
	});

	it('keeps the notice, saying the save failed, when the profile was not saved', async () => {
		mockSaveZone.mockResolvedValue(false);
		const { result } = await renderNotice();

		await act(() => result.current.adoptBrowserZone());

		expect(result.current.hasFailed).toBe(true);
		expect(result.current.notice?.pairKey).toBe(PAIR);
	});

	it('remembers a kept pair in the browser, across a reload', async () => {
		const { result } = await renderNotice();

		act(() => result.current.keepProfileZone());

		expect(result.current.notice).toBeNull();
		expect(window.localStorage.getItem(KEPT_TIME_ZONE_PAIR_STORAGE_KEY)).toBe(PAIR);
		const reloaded = freshHook();
		const afterReload = renderHook(() => reloaded());
		await waitFor(() => expect(afterReload.result.current.notice).toBeNull());
	});

	it('holds an answer for the next page of the same load', async () => {
		const useNotice = freshHook();
		const firstPage = renderHook(() => useNotice());
		await waitFor(() => expect(firstPage.result.current.notice).not.toBeNull());

		act(() => firstPage.result.current.dismiss());
		firstPage.unmount();
		const nextPage = renderHook(() => useNotice());

		expect(nextPage.result.current.notice).toBeNull();
	});

	it('reads the browser zone again when the page comes back to the front', async () => {
		const { result } = await renderNotice();
		act(() => result.current.keepProfileZone());
		expect(result.current.notice).toBeNull();

		// The laptop landed in Chicago while the page stayed open
		mockBrowserZone = 'America/Chicago';
		act(() => {
			window.dispatchEvent(new Event('focus'));
		});

		expect(result.current.notice?.browserZone).toBe('America/Chicago');
	});

	it('closes for the rest of the session only', async () => {
		const { result } = await renderNotice();

		act(() => result.current.dismiss());

		expect(result.current.notice).toBeNull();
		expect(window.sessionStorage.getItem(DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY)).toBe(PAIR);
		expect(window.localStorage.getItem(KEPT_TIME_ZONE_PAIR_STORAGE_KEY)).toBeNull();
	});
});
