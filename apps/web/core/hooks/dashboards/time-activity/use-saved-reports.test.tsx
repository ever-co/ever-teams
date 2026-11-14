/** @jest-environment jsdom */
import React, { type ReactNode } from 'react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockSavedReportService = {
	list: jest.fn(),
	create: jest.fn(),
	update: jest.fn(),
	remove: jest.fn(),
	share: jest.fn(),
	unshare: jest.fn()
};

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/timesheets/saved-report.service', () => ({
	get savedReportService() {
		return mockSavedReportService;
	}
}));

import { type SavedReportsScope, useSavedReports } from './use-saved-reports';

const SCOPE: SavedReportsScope = { tenantId: 'tenant-1', organizationId: 'organization-1', userId: 'user-1' };

const REPORT = { id: 'r1', authorId: 'user-1', name: 'Client A, last month', kind: 'TIME_AND_ACTIVITY' };

function setup(scope: SavedReportsScope = SCOPE) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<JotaiProvider store={store}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</JotaiProvider>
	);
	return renderHook(() => useSavedReports(scope), { wrapper });
}

describe('useSavedReports', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSavedReportService.list.mockResolvedValue({ items: [REPORT], total: 1 });
	});

	it("lists the member's reports of the active organization", async () => {
		const { result } = setup();

		await waitFor(() => expect(result.current.availability).toBe('ready'));
		expect(result.current.reports).toEqual([REPORT]);
		expect(mockSavedReportService.list).toHaveBeenCalledWith('organization-1');
	});

	it('reads nothing before the organization is known', () => {
		const { result } = setup({ ...SCOPE, organizationId: null });

		expect(result.current.availability).toBe('loading');
		expect(mockSavedReportService.list).not.toHaveBeenCalled();
	});

	it('says saved reports are not available on an API that answers 404, and retries nothing', async () => {
		mockSavedReportService.list.mockRejectedValue({ statusCode: 404, message: 'Cannot GET /api/saved-reports' });

		const { result } = setup();

		await waitFor(() => expect(result.current.availability).toBe('unsupported'));
		expect(mockSavedReportService.list).toHaveBeenCalledTimes(1);
	});

	it('says the list could not be read on another failure', async () => {
		mockSavedReportService.list.mockRejectedValue({ statusCode: 403, message: 'Forbidden' });

		const { result } = setup();

		await waitFor(() => expect(result.current.availability).toBe('error'));
	});

	it('saves with the tenant and organization of the scope, then reads the list again', async () => {
		mockSavedReportService.create.mockResolvedValue({ ...REPORT, id: 'r2' });
		const { result } = setup();
		await waitFor(() => expect(result.current.availability).toBe('ready'));

		await act(() => result.current.create.mutateAsync({ name: 'Client B', periodRule: 'thisMonth' }));

		expect(mockSavedReportService.create).toHaveBeenCalledWith({
			name: 'Client B',
			periodRule: 'thisMonth',
			tenantId: 'tenant-1',
			organizationId: 'organization-1'
		});
		await waitFor(() => expect(mockSavedReportService.list).toHaveBeenCalledTimes(2));
	});

	it('keeps the token of a new link for the visit, and forgets it once the link is turned off', async () => {
		mockSavedReportService.share.mockResolvedValue({ token: 'tok-1', sharedAt: 'now', shareExpiresAt: null });
		mockSavedReportService.unshare.mockResolvedValue(undefined);
		const { result } = setup();
		await waitFor(() => expect(result.current.availability).toBe('ready'));

		await act(() => result.current.share.mutateAsync({ id: 'r1', expiresAt: null }));
		expect(result.current.linkTokens).toEqual({ r1: 'tok-1' });

		await act(() => result.current.unshare.mutateAsync('r1'));
		expect(result.current.linkTokens).toEqual({});
	});

	it('forgets the token of a deleted report', async () => {
		mockSavedReportService.share.mockResolvedValue({ token: 'tok-1', sharedAt: 'now', shareExpiresAt: null });
		mockSavedReportService.remove.mockResolvedValue(undefined);
		const { result } = setup();
		await waitFor(() => expect(result.current.availability).toBe('ready'));

		await act(() => result.current.share.mutateAsync({ id: 'r1', expiresAt: null }));
		await act(() => result.current.remove.mutateAsync('r1'));

		expect(result.current.linkTokens).toEqual({});
		expect(mockSavedReportService.remove).toHaveBeenCalledWith('r1');
	});
});
