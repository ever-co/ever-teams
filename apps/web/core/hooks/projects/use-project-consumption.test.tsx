/** @jest-environment jsdom */

import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { useProjectBudgetRows } from '@/core/hooks/dashboards/project-budget/use-project-budget-rows';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import { useProjectConsumption } from './use-project-consumption';

const mockGetProjectBudgetReport = jest.fn();
const mockOrganizationRead = jest.fn();
const mockRefetchOrganization = jest.fn();

const mockProjects = [
	{ id: 'hours-half', name: 'Website', budgetType: EProjectBudgetType.HOURS, budget: 80 },
	{ id: 'budget-idle', name: 'Audit', budgetType: EProjectBudgetType.HOURS, budget: 20 },
	{ id: 'untouched', name: 'Archive' }
];

jest.mock('@/core/services/client/api/timesheets/time-log-report.service', () => ({
	timeLogReportService: { getProjectBudgetReport: (...args: unknown[]) => mockGetProjectBudgetReport(...args) }
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: mockProjects,
		getOrganizationProjectsLoading: false,
		isOrganizationProjectsError: false,
		refetchOrganizationProjects: () => undefined
	})
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: (options: { enabled: boolean }) => mockOrganizationRead(options)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/lib/helpers/date-and-time', () => ({ getDefaultTimezone: () => 'UTC' }));
jest.mock('@/core/stores', () => ({ canManageActiveTeamState: {} }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const REPORTS = [
	{
		project: { id: 'hours-half', name: 'Website' },
		budgetType: EProjectBudgetType.HOURS,
		budget: 80,
		spent: 40,
		remainingBudget: 40,
		spentPercentage: 50
	}
];

function clientOf() {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapperOf(client: QueryClient) {
	const store = createStore();
	store.set(currentOrganizationState, { currency: 'USD' } as never);
	return function Wrapper({ children }: PropsWithChildren) {
		return (
			<Provider store={store}>
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			</Provider>
		);
	};
}

beforeEach(() => {
	mockGetProjectBudgetReport.mockResolvedValue(REPORTS);
	mockOrganizationRead.mockReturnValue({ isError: false, refetch: mockRefetchOrganization });
});

describe('useProjectConsumption', () => {
	it('reads the budget report once for every project, without naming any', async () => {
		const client = clientOf();
		const { result } = renderHook(() => useProjectConsumption({ isEnabled: true }), {
			wrapper: wrapperOf(client)
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockGetProjectBudgetReport).toHaveBeenCalledTimes(1);
		expect(mockGetProjectBudgetReport).toHaveBeenCalledWith({
			from: expect.any(Date),
			to: expect.any(Date),
			timeZone: 'UTC'
		});
		expect(result.current.isAvailable).toBe(true);
		expect(result.current.hasFailed).toBe(false);
		expect(result.current.rowOf('hours-half')?.spent).toBe(40);
		expect(result.current.rowOf('hours-half')?.share).toBe(50);
		expect(result.current.rowOf('budget-idle')?.budget).toBe(20);
		expect(result.current.rowOf('untouched')).toBeUndefined();
	});

	it("reads it under the Project Budget report's own key, so the report and a project share one answer", async () => {
		const client = clientOf();
		const { result } = renderHook(
			() => {
				const consumption = useProjectConsumption({ isEnabled: true });
				const report = useProjectBudgetRows({
					scope: 'whole',
					period: null,
					unnamedLabel: 'Unnamed',
					followsLiveTime: true,
					isEnabled: true
				});
				return { consumption, report };
			},
			{ wrapper: wrapperOf(client) }
		);

		await waitFor(() => expect(result.current.consumption.isLoading).toBe(false));

		expect(mockGetProjectBudgetReport).toHaveBeenCalledTimes(1);
		const reportRow = result.current.report.shown?.rows.find((row) => row.project.id === 'hours-half');
		expect(result.current.consumption.rowOf('hours-half')).toEqual(reportRow);
		const [query] = client.getQueryCache().getAll();
		expect(query.queryKey).toEqual([
			'timesheet',
			'reports',
			'project-budgets',
			expect.objectContaining({
				tenantId: 'tenant-1',
				organizationId: 'organization-1',
				scope: 'whole',
				timeZone: 'UTC'
			})
		]);
	});

	it('asks for nothing when the person cannot open the report', () => {
		const client = clientOf();
		const { result } = renderHook(() => useProjectConsumption({ isEnabled: false }), {
			wrapper: wrapperOf(client)
		});

		expect(mockGetProjectBudgetReport).not.toHaveBeenCalled();
		expect(mockOrganizationRead).toHaveBeenCalledWith({ enabled: false });
		expect(result.current.isAvailable).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.hasFailed).toBe(false);
		expect(result.current.rowOf('hours-half')).toBeUndefined();
	});

	it('says the read failed, then reads again on retry', async () => {
		mockGetProjectBudgetReport.mockRejectedValueOnce(new Error('Gauzy is down'));
		const client = clientOf();
		const { result } = renderHook(() => useProjectConsumption({ isEnabled: true }), {
			wrapper: wrapperOf(client)
		});

		await waitFor(() => expect(result.current.hasFailed).toBe(true));
		expect(result.current.isLoading).toBe(false);

		act(() => result.current.retry());

		await waitFor(() => expect(result.current.hasFailed).toBe(false));
		await waitFor(() => expect(result.current.rowOf('hours-half')?.spent).toBe(40));
		expect(mockRefetchOrganization).toHaveBeenCalledTimes(1);
	});

	it('says the read failed when the organisation, whose currency prices a cost, cannot load', async () => {
		mockOrganizationRead.mockReturnValue({ isError: true, refetch: mockRefetchOrganization });
		const client = clientOf();
		const { result } = renderHook(() => useProjectConsumption({ isEnabled: true }), {
			wrapper: wrapperOf(client)
		});

		await waitFor(() => expect(mockGetProjectBudgetReport).toHaveBeenCalledTimes(1));
		expect(result.current.hasFailed).toBe(true);
		expect(result.current.isLoading).toBe(false);
	});
});
