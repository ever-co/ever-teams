/** @jest-environment jsdom */

import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import { useProjectBudgetReport } from './use-project-budget-report';

const mockGetProjectBudgetReport = jest.fn();

const mockProjects = [
	{ id: 'p-1', name: 'Website', budgetType: EProjectBudgetType.HOURS, budget: 80 },
	{ id: 'p-2', name: 'Mobile app', budgetType: EProjectBudgetType.HOURS, budget: 10 },
	{ id: 'p-3', name: 'Archive' }
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
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('@/core/lib/helpers/date-and-time', () => ({ getDefaultTimezone: () => 'UTC' }));

function reportOf(id: string, name: string, budget: number, spent: number) {
	return {
		project: { id, name },
		budgetType: EProjectBudgetType.HOURS,
		budget,
		spent,
		remainingBudget: 0,
		spentPercentage: 0
	};
}

const REPORTS = [reportOf('p-1', 'Website', 80, 40), reportOf('p-2', 'Mobile app', 10, 12.5)];

function renderReport() {
	mockGetProjectBudgetReport.mockResolvedValue(REPORTS);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const store = createStore();
	store.set(currentOrganizationState, { currency: 'USD' } as never);
	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		</Provider>
	);
	return renderHook(() => useProjectBudgetReport({ unnamedLabel: 'Unnamed' }), { wrapper });
}

function shownIdsOf(rows: ReadonlyArray<{ project: { id: string } }>) {
	return rows.map((row) => row.project.id);
}

describe('useProjectBudgetReport', () => {
	it('shows every project the report or a budget gives a row to, from one read', async () => {
		const { result } = renderReport();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.isFiltered).toBe(false);
		expect(shownIdsOf(result.current.visibleRows)).toEqual(['p-1', 'p-2']);
		expect(result.current.figures.overCount).toBe(1);
		expect(mockGetProjectBudgetReport).toHaveBeenCalledTimes(1);
	});

	it('narrows the rows to the projects picked in its filter, and shows them all again once cleared', async () => {
		const { result } = renderReport();
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		act(() => result.current.setFilter('projects', ['p-2']));
		expect(shownIdsOf(result.current.visibleRows)).toEqual(['p-2']);

		act(() => result.current.clearFilters());
		expect(shownIdsOf(result.current.visibleRows)).toEqual(['p-1', 'p-2']);
	});
});
