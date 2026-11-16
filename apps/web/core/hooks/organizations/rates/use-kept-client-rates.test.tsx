/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockReports = { getBillableTimeLogs: jest.fn() };

// Getters: the mocked modules load before this file's constants are set, and read them only when called
jest.mock('@/core/services/client/api/timesheets/time-log-report.service', () => ({
	get timeLogReportService() {
		return mockReports;
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { useKeptClientRates } from './use-kept-client-rates';

const lastWeek = {
	from: new Date(2026, 10, 9),
	to: new Date(2026, 10, 15, 23, 59, 59, 999),
	timeZone: 'Europe/Paris',
	employeeIds: ['member-ada'],
	projectIds: ['project-site']
};
const keptAt90 = {
	id: 'log-tuesday',
	projectId: 'project-site',
	employeeId: 'member-ada',
	isBillable: true,
	ratesStored: true,
	clientRates: {
		projectBillRateValue: 90,
		projectMemberBillRateValue: null,
		projectBillRateCurrency: 'EUR',
		projectMemberBillRateCurrency: null
	}
};

function renderKeptRates(range: typeof lastWeek | null, isEnabled = true) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useKeptClientRates(range, isEnabled), { wrapper });
}

describe('the client rates the entries of My week kept (CORE-29)', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockReset();
	});

	it('reads the billable entries of the range with the client rates they keep, by entry', async () => {
		mockReports.getBillableTimeLogs.mockResolvedValue([keptAt90]);

		const { result } = renderKeptRates(lastWeek);
		await waitFor(() => expect(result.current.keptById.size).toBe(1));

		expect(mockReports.getBillableTimeLogs).toHaveBeenCalledWith(lastWeek, [], {
			notInvoiced: false,
			scope: { tenantId: 'tenant-1', organizationId: 'organization-1' },
			withClientRates: true
		});
		expect(result.current.keptById.get('log-tuesday')).toEqual(keptAt90);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.hasFailed).toBe(false);
	});

	it('reads nothing for a week without billable projects, or for a role that does not see the amount', async () => {
		const withoutProjects = renderKeptRates({ ...lastWeek, projectIds: [] });
		const notOffered = renderKeptRates(lastWeek, false);
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockReports.getBillableTimeLogs).not.toHaveBeenCalled();
		expect(withoutProjects.result.current.isLoading).toBe(false);
		expect(notOffered.result.current.keptById.size).toBe(0);
	});

	it('leaves every entry at today’s rates when the API refuses the kept rates, without calling it a failure', async () => {
		mockReports.getBillableTimeLogs.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }));

		const { result } = renderKeptRates(lastWeek);
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.keptById.size).toBe(0);
		expect(result.current.hasFailed).toBe(false);
	});

	it('says the amount could not be read when the read fails otherwise, after trying again as the rates do', async () => {
		mockReports.getBillableTimeLogs.mockRejectedValue(Object.assign(new Error('Bad Gateway'), { statusCode: 502 }));

		const { result } = renderKeptRates(lastWeek);
		// Two more tries, a second then two apart, before it is a failure
		await waitFor(() => expect(result.current.hasFailed).toBe(true), { timeout: 6000 });

		expect(mockReports.getBillableTimeLogs).toHaveBeenCalledTimes(3);
		expect(result.current.keptById.size).toBe(0);
	}, 10000);
});
