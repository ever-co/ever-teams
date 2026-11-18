/** @jest-environment jsdom */
import React, { type ReactNode } from 'react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockKeepsEntryLabels = jest.fn();
let mockHasEntryLabels = true;

jest.mock('@/core/services/client/api/timesheets/saved-report.service', () => ({
	savedReportService: { keepsEntryLabels: () => mockKeepsEntryLabels() }
}));
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({
	useEntryLabelsSupport: () => mockHasEntryLabels
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { shellSettledState } from '@/core/stores/common/shell';
import { useSavedReportLabelsSupport } from './use-saved-report-labels-support';

function setup(isNeeded: boolean) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(shellSettledState, true);
	const wrapper = ({ children }: { children: ReactNode }) => (
		<JotaiProvider store={store}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</JotaiProvider>
	);
	return renderHook(({ needed }) => useSavedReportLabelsSupport(needed), {
		wrapper,
		initialProps: { needed: isNeeded }
	});
}

describe('useSavedReportLabelsSupport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockHasEntryLabels = true;
		mockKeepsEntryLabels.mockResolvedValue(true);
	});

	it('asks Gauzy nothing while no view or report uses labels, and keeps none', () => {
		const { result } = setup(false);

		expect(result.current).toBe(false);
		expect(mockKeepsEntryLabels).not.toHaveBeenCalled();
	});

	it('asks Gauzy once a view uses labels, and keeps them where Gauzy does', async () => {
		const { result, rerender } = setup(false);

		rerender({ needed: true });

		await waitFor(() => expect(result.current).toBe(true));
		rerender({ needed: false });
		rerender({ needed: true });
		expect(mockKeepsEntryLabels).toHaveBeenCalledTimes(1);
	});

	it('keeps none where an older Gauzy does not', async () => {
		mockKeepsEntryLabels.mockResolvedValue(false);
		const { result } = setup(true);

		await waitFor(() => expect(mockKeepsEntryLabels).toHaveBeenCalledTimes(1));
		expect(result.current).toBe(false);
	});

	it('asks nothing, and keeps none, where entries have no labels at all', () => {
		mockHasEntryLabels = false;
		const { result } = setup(true);

		expect(result.current).toBe(false);
		expect(mockKeepsEntryLabels).not.toHaveBeenCalled();
	});
});
