/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
}

/** An answer of the API the test gives when it chooses to. */
function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((onResolve) => {
		resolve = onResolve;
	});
	return { promise, resolve };
}

const mockReports = { getBillableTimeLogs: jest.fn(), getOwedAmountReport: jest.fn() };
const mockRates = { getProjectRates: jest.fn() };
const mockProjectsQuery = {
	organizationProjects: [{ id: 'project-site', name: 'Site', organizationContactId: 'client-acme', currency: 'USD' }],
	isOrganizationProjectsLoaded: true,
	isOrganizationProjectsError: false,
	refetchOrganizationProjects: jest.fn()
};

// Getters: the mocked modules load before this file's constants are set, and read them only when called
jest.mock('@/core/services/client/api/timesheets/time-log-report.service', () => ({
	get timeLogReportService() {
		return mockReports;
	}
}));
jest.mock('@/core/services/client/api/organizations/rate.service', () => ({
	get rateService() {
		return mockRates;
	}
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => mockProjectsQuery
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { useInvoiceTime } from './use-invoice-time';

const october: Period = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31) };
const labels = { unnamedProject: 'Unnamed project', unnamedMember: 'Unnamed member', noTask: 'No task' };
const adaTime = {
	projectId: 'project-site',
	employeeId: 'member-ada',
	taskId: null,
	isBillable: true,
	duration: 36000
};
const ada = { id: 'member-ada', billRateValue: 80, billRateCurrency: 'USD', user: { firstName: 'Ada' } };
const owedReport = [{ employees: [{ employee: ada }] }];
const siteRates = { id: 'project-site', billRateValue: null, currency: 'USD', members: [] };

function renderInvoiceTime() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, { id: 'organization-1', currency: 'USD' } as TOrganization);
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const rendered = renderHook(
		() => useInvoiceTime({ clientId: 'client-acme', period: october, grouping: 'member', labels }),
		{ wrapper }
	);
	return { ...rendered, queryClient };
}

describe('the billable time of a new invoice while it is read again', () => {
	beforeEach(() => {
		mockReports.getBillableTimeLogs.mockResolvedValue([adaTime]);
		mockReports.getOwedAmountReport.mockResolvedValue(owedReport);
		mockRates.getProjectRates.mockResolvedValue(siteRates);
	});

	async function renderReadTime() {
		const rendered = renderInvoiceTime();
		await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
		expect(rendered.result.current.lines).toHaveLength(1);
		expect(rendered.result.current.isUpdating).toBe(false);
		return rendered;
	}

	it('is being updated while the members’ own rates are read again', async () => {
		const { result, queryClient } = await renderReadTime();
		const report = deferred<unknown>();
		mockReports.getOwedAmountReport.mockReturnValueOnce(report.promise);

		act(() => {
			void queryClient.refetchQueries({ queryKey: ['timesheet', 'reports', 'owed-amounts'] });
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(true));

		await act(async () => {
			report.resolve(owedReport);
			await report.promise;
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(false));
	});

	it('is being updated while the client rates of a project are read again', async () => {
		const { result, queryClient } = await renderReadTime();
		const rates = deferred<unknown>();
		mockRates.getProjectRates.mockReturnValueOnce(rates.promise);

		act(() => {
			void queryClient.refetchQueries({ queryKey: ['rates'] });
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(true));

		await act(async () => {
			rates.resolve(siteRates);
			await rates.promise;
		});
		await waitFor(() => expect(result.current.isUpdating).toBe(false));
	});
});
