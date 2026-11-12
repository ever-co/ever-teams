/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

const mockUseTimesheetPageLogs = jest.fn();

jest.mock('next-intl', () => ({ useLocale: () => 'en' }));
jest.mock('@/core/hooks/queries/user-user.query', () => {
	const user = {
		id: 'user',
		tenantId: 'tenant',
		timeZone: 'UTC',
		employee: { id: 'viewer', organizationId: 'organization' }
	};
	return { useUserQuery: () => ({ data: user }) };
});
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => {
	const permissions = { myPermissions: [] };
	return { useMyRolePermissionsQuery: () => permissions };
});
jest.mock('@/core/hooks/dashboards/use-report-clients', () => {
	const projectClients = { projects: [], clientIds: new Map(), isPending: false, isError: false };
	const choices: unknown[] = [];
	return { useReportProjectClients: () => projectClients, useReportClientChoices: () => choices };
});
jest.mock('@/core/hooks/dashboards/use-report-url-filters', () => {
	const urlFilters = {
		filters: { clients: [], billable: [], labels: [] },
		setFilter: jest.fn(),
		removeFilterValue: jest.fn(),
		clearFilters: jest.fn()
	};
	return { useReportUrlFilters: () => urlFilters };
});
jest.mock('./use-timesheet-page-logs', () => ({
	useTimesheetPageLogs: (...args: unknown[]) => mockUseTimesheetPageLogs(...args)
}));

import { useTimesheetsPage } from './use-timesheets-page';

describe("the Timesheets page's read of its logs", () => {
	it('asks the labels of each task, which the label filter reads from the logs it shows', () => {
		mockUseTimesheetPageLogs.mockReturnValue({
			data: [],
			isPlaceholderData: false,
			isError: false,
			isFetching: false
		});

		renderHook(() => useTimesheetsPage());

		expect(mockUseTimesheetPageLogs).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
			withTaskLabels: true
		});
	});
});
