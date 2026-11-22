/** @jest-environment jsdom */

/**
 * Kofi manages the Platform team through the team's manager flag; his role is the employee one, without
 * CAN_APPROVE_TIMESHEET (#5622). Gauzy gives him the time of the members he manages when a request names them, and
 * lets him approve or deny their timesheets, never his own.
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import type { TOrganizationTeam } from '@/core/types/schemas';

const mockUseTimesheetPageLogs = jest.fn();
const mockSession = {
	user: null as Record<string, unknown> | null,
	permissions: { myPermissions: ['TIME_TRACKER'] as string[] }
};

jest.mock('@/core/hooks/timer/use-breaks-allowed', () => ({ useBreaksAllowed: () => false }));
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({ useEntryLabelsSupport: () => false }));
jest.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockSession.user })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockSession.permissions
}));
jest.mock('@/core/hooks/dashboards/use-report-clients', () => {
	const projectClients = { projects: [], clientIds: new Map(), isPending: false, isError: false };
	const choices: unknown[] = [];
	return { useReportProjectClients: () => projectClients, useReportClientChoices: () => choices };
});
jest.mock('@/core/hooks/dashboards/use-report-url-filters', () => {
	const urlFilters = {
		filters: { clients: [], billable: [], labels: [], entryLabels: [] },
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

function membershipOf(employeeId: string, flags: Record<string, unknown> = {}) {
	return {
		employeeId,
		employee: { id: employeeId, userId: `${employeeId}-user` },
		isManager: false,
		isActive: true,
		isArchived: false,
		...flags
	};
}

const PLATFORM = {
	id: 'platform',
	name: 'Platform',
	members: [
		membershipOf('kofi', { isManager: true }),
		membershipOf('ronan'),
		membershipOf('amani'),
		membershipOf('lea', { isActive: false }),
		membershipOf('old', { isArchived: true })
	]
} as unknown as TOrganizationTeam;

function userOf(employeeId: string, roleName: string) {
	return {
		id: `${employeeId}-user`,
		tenantId: 'tenant',
		timeZone: 'UTC',
		role: { name: roleName },
		employee: { id: employeeId, organizationId: 'organization' }
	};
}

function renderPageAs(employeeId: string, roleName = 'EMPLOYEE', permissions = ['TIME_TRACKER']) {
	mockSession.user = userOf(employeeId, roleName);
	mockSession.permissions = { myPermissions: permissions };
	mockUseTimesheetPageLogs.mockReturnValue({
		data: [],
		isPlaceholderData: false,
		isError: false,
		isFetching: false,
		refetch: jest.fn()
	});
	const store = createStore();
	store.set(organizationTeamsState, [PLATFORM]);
	store.set(activeTeamIdState, 'platform');
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => useTimesheetsPage(), { wrapper });
}

function lastReadEmployeeIds(): string[] {
	const lastCall = mockUseTimesheetPageLogs.mock.calls.at(-1);
	const scope = lastCall?.[1] as { employeeIds: string[]; isEnabled: boolean };
	expect(scope.isEnabled).toBe(true);
	return [...scope.employeeIds].sort();
}

describe('the Timesheets page of a team manager without CAN_APPROVE_TIMESHEET (#5622)', () => {
	beforeEach(() => {
		mockUseTimesheetPageLogs.mockReset();
	});

	it('asks for the week of every member of the team he manages, his own included, without picking them', () => {
		renderPageAs('kofi');

		// Lea's and the archived membership are left out: Gauzy would answer the whole read with his own time only
		expect(lastReadEmployeeIds()).toEqual(['amani', 'kofi', 'ronan']);
	});

	it('still reads only the members he picks in Filter, Members', () => {
		const { result } = renderPageAs('kofi');

		act(() => {
			result.current.setFilter('members', ['ronan']);
		});

		expect(lastReadEmployeeIds()).toEqual(['ronan']);
	});

	it('CONTROL: a plain member still reads only their own time', () => {
		renderPageAs('ronan');

		expect(lastReadEmployeeIds()).toEqual(['ronan']);
	});

	it('CONTROL: an organization role still reads everyone it may see, with no employee named', () => {
		renderPageAs('kofi', 'ADMIN', ['TIME_TRACKER', 'CAN_APPROVE_TIMESHEET', 'CHANGE_SELECTED_EMPLOYEE']);

		expect(lastReadEmployeeIds()).toEqual([]);
	});
});
