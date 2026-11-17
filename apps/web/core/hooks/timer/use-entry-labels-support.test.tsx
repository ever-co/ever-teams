/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { shellSettledState } from '@/core/stores/common/shell';

const mockSupportsEntryLabels = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant',
	getOrganizationIdCookie: () => 'organization'
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { supportsEntryLabels: () => mockSupportsEntryLabels() }
}));

import { useEntryLabelsSupportState } from './use-entry-labels-support';

function renderSupport(isShellSettled: boolean) {
	const store = createStore();
	store.set(shellSettledState, isShellSettled);
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
		expect(result.current).toEqual({ isSupported: false, isKnown: false });
	});

	it('asks once the shell has settled', async () => {
		const { result, store } = renderSupport(false);

		act(() => {
			store.set(shellSettledState, true);
		});

		await waitFor(() => expect(result.current).toEqual({ isSupported: true, isKnown: true }));
		expect(mockSupportsEntryLabels).toHaveBeenCalledTimes(1);
	});
});
