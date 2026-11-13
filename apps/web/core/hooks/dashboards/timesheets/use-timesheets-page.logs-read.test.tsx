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
const mockProjectClients = {
	projects: [],
	clientIds: new Map<string, string | null>(),
	isPending: false,
	isError: false
};
const mockUrlFilters = {
	filters: { clients: [] as string[], billable: [] as string[], labels: [] as string[] },
	setFilter: jest.fn(),
	removeFilterValue: jest.fn(),
	clearFilters: jest.fn()
};
jest.mock('@/core/hooks/dashboards/use-report-clients', () => {
	const choices: unknown[] = [];
	return { useReportProjectClients: () => mockProjectClients, useReportClientChoices: () => choices };
});
jest.mock('@/core/hooks/dashboards/use-report-url-filters', () => ({
	useReportUrlFilters: () => mockUrlFilters
}));
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

function logOf(id: string, projectId: string) {
	return {
		id,
		projectId,
		project: { id: projectId, name: projectId },
		employee: { id: 'viewer', fullName: 'Ada' },
		startedAt: new Date(2026, 10, 10, 9),
		stoppedAt: new Date(2026, 10, 10, 10),
		duration: 3600
	};
}

describe('the Timesheets page under a client filter', () => {
	afterEach(() => {
		mockProjectClients.isPending = false;
		mockProjectClients.clientIds = new Map();
		mockUrlFilters.filters.clients = [];
	});

	it("shows (and so exports) no time until it has read which projects are the client's", () => {
		mockUseTimesheetPageLogs.mockReturnValue({
			data: [logOf('active-project-log', 'project-active'), logOf('archived-project-log', 'project-archived')],
			isPlaceholderData: false,
			isError: false,
			isFetching: false
		});
		mockUrlFilters.filters.clients = ['client-acme'];
		mockProjectClients.isPending = true;
		mockProjectClients.clientIds = new Map([['project-active', 'client-acme']]);

		const { result, rerender } = renderHook(() => useTimesheetsPage());

		expect(result.current.shownLogs).toEqual([]);

		mockProjectClients.isPending = false;
		mockProjectClients.clientIds = new Map([
			['project-active', 'client-acme'],
			['project-archived', 'client-acme']
		]);
		rerender();

		const shownIds = result.current.shownLogs.map((log) => log.id).sort();
		expect(shownIds).toEqual(['active-project-log', 'archived-project-log']);
	});
});
