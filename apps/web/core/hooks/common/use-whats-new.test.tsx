/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WHATS_NEW_SEEN_STORAGE_KEY, useWhatsNew } from './use-whats-new';

const mockGetEntries = jest.fn();

jest.mock('@/core/services/client/api/changelog.service', () => ({
	EVER_TEAMS_CHANGELOG_PLATFORM: 'ever-teams',
	changelogService: { getEntries: (...args: unknown[]) => mockGetEntries(...args) }
}));

const entry = (id: string, date: string) => ({
	id,
	icon: 'gift-outline',
	title: id,
	date,
	content: 'x',
	learnMoreUrl: null
});

function wrapper({ children }: { children: React.ReactNode }) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useWhatsNew', () => {
	beforeEach(() => {
		window.localStorage.clear();
		mockGetEntries.mockReset();
	});

	it("asks for Ever Teams' entries and marks the unseen ones until the panel is opened", async () => {
		mockGetEntries.mockResolvedValue([
			entry('new', '2026-11-08T00:00:00.000Z'),
			entry('old', '2026-10-02T00:00:00.000Z')
		]);
		const { result } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(result.current.entries).toHaveLength(2));
		expect(mockGetEntries).toHaveBeenCalledWith('ever-teams');
		expect(result.current.hasUnseen).toBe(true);

		act(() => result.current.markSeen());

		expect(result.current.hasUnseen).toBe(false);
		expect(window.localStorage.getItem(WHATS_NEW_SEEN_STORAGE_KEY)).toBe('2026-11-08T00:00:00.000Z');
	});

	it('shows no dot when everything listed was already seen, and one again for a newer entry', async () => {
		window.localStorage.setItem(WHATS_NEW_SEEN_STORAGE_KEY, '2026-11-08T00:00:00.000Z');
		mockGetEntries.mockResolvedValue([entry('seen', '2026-11-08T00:00:00.000Z')]);
		const { result, unmount } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(result.current.entries).toHaveLength(1));
		expect(result.current.hasUnseen).toBe(false);
		unmount();

		mockGetEntries.mockResolvedValue([entry('newer', '2026-11-20T00:00:00.000Z')]);
		const next = renderHook(() => useWhatsNew(), { wrapper });
		await waitFor(() => expect(next.result.current.entries).toHaveLength(1));
		expect(next.result.current.hasUnseen).toBe(true);
	});

	it('has no dot and nothing to mark when there are no entries', async () => {
		mockGetEntries.mockResolvedValue([]);
		const { result } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(mockGetEntries).toHaveBeenCalled());
		act(() => result.current.markSeen());

		expect(result.current.hasUnseen).toBe(false);
		expect(window.localStorage.getItem(WHATS_NEW_SEEN_STORAGE_KEY)).toBeNull();
	});

	it('keeps working when the browser storage refuses writes', async () => {
		const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		mockGetEntries.mockResolvedValue([entry('new', '2026-12-01T00:00:00.000Z')]);
		const { result } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(result.current.entries).toHaveLength(1));
		act(() => result.current.markSeen());

		expect(result.current.hasUnseen).toBe(false);
		setItem.mockRestore();
	});

	it('clears the dot when the storage reads an older date but refuses the write', async () => {
		window.localStorage.setItem(WHATS_NEW_SEEN_STORAGE_KEY, '2026-01-01T00:00:00.000Z');
		const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		mockGetEntries.mockResolvedValue([entry('new', '2026-12-02T00:00:00.000Z')]);
		const { result } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(result.current.entries).toHaveLength(1));
		expect(result.current.hasUnseen).toBe(true);
		act(() => result.current.markSeen());

		expect(result.current.hasUnseen).toBe(false);
		setItem.mockRestore();
	});

	it('never moves the seen date backwards (a tab with an older list)', async () => {
		window.localStorage.setItem(WHATS_NEW_SEEN_STORAGE_KEY, '2027-01-01T00:00:00.000Z');
		mockGetEntries.mockResolvedValue([entry('old', '2026-11-08T00:00:00.000Z')]);
		const { result } = renderHook(() => useWhatsNew(), { wrapper });

		await waitFor(() => expect(result.current.entries).toHaveLength(1));
		act(() => result.current.markSeen());

		expect(window.localStorage.getItem(WHATS_NEW_SEEN_STORAGE_KEY)).toBe('2027-01-01T00:00:00.000Z');
	});
});
