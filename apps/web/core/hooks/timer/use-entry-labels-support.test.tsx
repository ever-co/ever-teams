/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { shellSettledState } from '@/core/stores/common/shell';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

const mockSupportsEntryLabels = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant',
	getOrganizationIdCookie: () => 'organization'
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { supportsEntryLabels: () => mockSupportsEntryLabels() }
}));

import { useEntryLabelsSupportState } from './use-entry-labels-support';

function renderSupport(isShellSettled: boolean, timerStatus: ITimerStatus | null = null) {
	const store = createStore();
	store.set(shellSettledState, isShellSettled);
	store.set(timerStatusState, timerStatus);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const hook = renderHook(() => useEntryLabelsSupportState(), { wrapper });
	return { ...hook, store };
}

describe('the probe of labels on entries and the app shell (#5368)', () => {
	beforeEach(() => {
		mockSupportsEntryLabels.mockReset().mockResolvedValue(true);
	});

	// The timer that shows Labels is in the shell of every page: a probe on mount would be one more Gauzy read before
	// the shell is ready (startup-performance.cy.ts, shell-startup-reads.test.ts)
	it('asks Gauzy nothing before the shell has settled, and says the answer is not known yet', async () => {
		const { result } = renderSupport(false);

		await act(async () => {
			await Promise.resolve();
		});

		expect(mockSupportsEntryLabels).not.toHaveBeenCalled();
		expect(result.current).toMatchObject({ isSupported: false, isKnown: false });
	});

	it('asks once the shell has settled', async () => {
		const { result, store } = renderSupport(false);

		act(() => {
			store.set(shellSettledState, true);
		});

		await waitFor(() => expect(result.current).toMatchObject({ isSupported: true, isKnown: true }));
		expect(mockSupportsEntryLabels).toHaveBeenCalledTimes(1);
	});
});

/** A status whose last entry is as an API sends it: with `tags` from one that has labels on entries, without from one that has not. */
function statusWithLastEntry(tags?: unknown[]): ITimerStatus {
	const lastLog = { id: 'log-1', startedAt: '2026-11-17T09:00:00.000Z', ...(tags ? { tags } : {}) };
	return { duration: 0, running: true, lastLog } as unknown as ITimerStatus;
}

describe('the answer the timer status gives (startup-performance.cy.ts rich reads)', () => {
	beforeEach(() => {
		mockSupportsEntryLabels.mockReset().mockResolvedValue(true);
	});

	// The probe is a time-log list read: in the cold-start window the budget refuses any (rich global reads), and the
	// status, read by every page's shell, already says it whenever there is a last entry
	it('takes labels as supported from a last entry sent with its labels, an empty list too, and asks Gauzy nothing', async () => {
		const { result } = renderSupport(true, statusWithLastEntry([]));

		await waitFor(() => expect(result.current).toMatchObject({ isSupported: true, isKnown: true }));
		await act(async () => {
			await Promise.resolve();
		});
		expect(mockSupportsEntryLabels).not.toHaveBeenCalled();
	});

	it('takes labels as not supported from a last entry sent with no labels at all, and asks Gauzy nothing', async () => {
		const { result } = renderSupport(true, statusWithLastEntry());

		await waitFor(() => expect(result.current).toMatchObject({ isSupported: false, isKnown: true }));
		await act(async () => {
			await Promise.resolve();
		});
		expect(mockSupportsEntryLabels).not.toHaveBeenCalled();
	});

	it('asks Gauzy once the shell has settled when the status has no last entry', async () => {
		const { result } = renderSupport(true, { duration: 0, running: false, lastLog: undefined } as ITimerStatus);

		await waitFor(() => expect(result.current).toMatchObject({ isSupported: true, isKnown: true }));
		expect(mockSupportsEntryLabels).toHaveBeenCalledTimes(1);
	});

	// A status the app writes itself (after a stop or a discard) may not carry the entry's labels
	it('keeps the first answer when a later status comes without labels', async () => {
		const { result, store } = renderSupport(true, statusWithLastEntry([]));
		await waitFor(() => expect(result.current).toMatchObject({ isSupported: true, isKnown: true }));

		act(() => {
			store.set(timerStatusState, statusWithLastEntry());
		});

		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current).toMatchObject({ isSupported: true, isKnown: true });
		expect(mockSupportsEntryLabels).not.toHaveBeenCalled();
	});
});
