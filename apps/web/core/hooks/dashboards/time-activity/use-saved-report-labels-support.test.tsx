/** @jest-environment jsdom */
import React, { type ReactNode } from 'react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockKeepsEntryLabels = jest.fn();
let mockEntryLabels = { isSupported: true, isKnown: true };

jest.mock('@/core/services/client/api/timesheets/saved-report.service', () => ({
	savedReportService: { keepsEntryLabels: () => mockKeepsEntryLabels() }
}));
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({
	useEntryLabelsSupportState: () => mockEntryLabels
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
		mockEntryLabels = { isSupported: true, isKnown: true };
		mockKeepsEntryLabels.mockResolvedValue(true);
	});

	it('asks Gauzy nothing while no view or report uses labels, and keeps none', () => {
		const { result } = setup(false);

		expect(result.current.keepsEntryLabels).toBe(false);
		expect(mockKeepsEntryLabels).not.toHaveBeenCalled();
	});

	it('says it is checking until Gauzy answers, then keeps labels where Gauzy does, asking once', async () => {
		const { result, rerender } = setup(false);

		rerender({ needed: true });
		expect(result.current.support).toBe('checking');
		expect(result.current.keepsEntryLabels).toBe(false);

		await waitFor(() => expect(result.current.support).toBe('kept'));
		expect(result.current.keepsEntryLabels).toBe(true);
		rerender({ needed: false });
		rerender({ needed: true });
		expect(mockKeepsEntryLabels).toHaveBeenCalledTimes(1);
	});

	it('keeps none, once answered, where an older Gauzy does not', async () => {
		mockKeepsEntryLabels.mockResolvedValue(false);
		const { result } = setup(true);

		// `not-kept` is the settled answer, never the state of a read still pending (`checking`)
		await waitFor(() => expect(result.current.support).toBe('not-kept'));
		expect(result.current.keepsEntryLabels).toBe(false);
	});

	it('asks nothing, and keeps none, where entries have no labels at all', () => {
		mockEntryLabels = { isSupported: false, isKnown: true };
		const { result } = setup(true);

		expect(result.current.support).toBe('not-kept');
		expect(mockKeepsEntryLabels).not.toHaveBeenCalled();
	});

	it('says it is checking while it is not known yet whether entries have labels', () => {
		mockEntryLabels = { isSupported: false, isKnown: false };
		const { result } = setup(true);

		expect(result.current.support).toBe('checking');
		expect(mockKeepsEntryLabels).not.toHaveBeenCalled();
	});
});
