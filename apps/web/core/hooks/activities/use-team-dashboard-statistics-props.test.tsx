/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { UseReportActivityProps } from './use-activity-filters';

const mockUseAtomValue = jest.fn();
let mockUserManagedTeams: TOrganizationTeam[] = [];
let mockUser: { role: { name: string } } | null = null;

jest.mock('jotai', () => ({ useAtomValue: (atom: unknown) => mockUseAtomValue(atom) }));
jest.mock('@/core/stores', () => ({
	activeTeamState: 'active-team',
	organizationTeamsState: 'organization-teams'
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-managers', () => ({
	useOrganizationAndTeamManagers: () => ({ userManagedTeams: mockUserManagedTeams })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
// use-activity-filters also exports hooks built on these; the props hook only uses its pure helpers
jest.mock('@/core/hooks/auth', () => ({ useAuthenticateUser: jest.fn() }));
jest.mock('./use-timelog-filter-options', () => ({ useTimelogFilterOptions: jest.fn() }));

import { useTeamDashboardStatisticsProps } from './use-team-dashboard-statistics-props';

const PAGE_TEAM_ID = 'page-team';

// A team manager with nothing picked in the dashboard filter
const mergedProps = {
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	startDate: '2026-10-19',
	endDate: '2026-10-25',
	groupBy: 'date',
	employeeIds: [],
	teamIds: [],
	projectIds: [],
	taskIds: [],
	selectedEmployeeIds: [],
	selectedTeamIds: []
} as unknown as Required<UseReportActivityProps>;

function buildTeam(members: Array<{ employeeId: string; isActive?: boolean; isArchived?: boolean }>) {
	return { id: PAGE_TEAM_ID, members } as unknown as TOrganizationTeam;
}

function buildActiveMembers(count: number) {
	return Array.from({ length: count }, (_, index) => ({ employeeId: `employee-${index}` }));
}

function renderProps(team: TOrganizationTeam, props: Required<UseReportActivityProps>) {
	mockUserManagedTeams = [team];
	mockUseAtomValue.mockImplementation((atom: unknown) => {
		if (atom === 'organization-teams') return [team];
		return team;
	});

	const { result } = renderHook(() =>
		useTeamDashboardStatisticsProps({ mergedProps: props, isManage: true, routeTeamId: PAGE_TEAM_ID })
	);

	return result.current;
}

// The counts request of a manager: the page team and no employee id, so the API resolves the members itself
const countsProps = { ...mergedProps, teamId: PAGE_TEAM_ID, teamIds: [PAGE_TEAM_ID], employeeIds: [] };

describe('useTeamDashboardStatisticsProps', () => {
	beforeEach(() => {
		mockUser = { role: { name: 'EMPLOYEE' } };
	});

	it('names the active members of a small team in the chart and daily report, not in the counts', () => {
		const team = buildTeam([
			{ employeeId: 'manager' },
			{ employeeId: 'member-1' },
			{ employeeId: 'member-1' },
			{ employeeId: 'left', isActive: false },
			{ employeeId: 'archived', isArchived: true }
		]);

		const { statisticsProps, reportProps } = renderProps(team, mergedProps);

		expect(reportProps).toEqual({ ...countsProps, employeeIds: ['manager', 'member-1'] });
		expect(statisticsProps).toEqual(countsProps);
	});

	it('names up to 20 members, the most the API parses as an array from a query string', () => {
		const team = buildTeam(buildActiveMembers(20));

		const { reportProps } = renderProps(team, mergedProps);

		expect(reportProps?.employeeIds).toHaveLength(20);
	});

	it('keeps the chart and daily report request of a team with more than 20 active members', () => {
		const team = buildTeam(buildActiveMembers(21));

		const { statisticsProps, reportProps } = renderProps(team, mergedProps);

		expect(reportProps).toEqual({ ...mergedProps, teamId: PAGE_TEAM_ID });
		expect(statisticsProps).toEqual(countsProps);
	});

	it('keeps the request of member picks and of organization-wide viewers', () => {
		const team = buildTeam(buildActiveMembers(3));
		const pickedProps = { ...mergedProps, employeeIds: ['employee-1'], teamIds: [PAGE_TEAM_ID] };

		const picked = renderProps(team, pickedProps);

		expect(picked.reportProps).toEqual({ ...pickedProps, teamId: PAGE_TEAM_ID });
		expect(picked.statisticsProps).toEqual({ ...pickedProps, teamId: PAGE_TEAM_ID });

		mockUser = { role: { name: 'ADMIN' } };

		const admin = renderProps(team, mergedProps);

		expect(admin.reportProps).toEqual({ ...mergedProps, teamId: PAGE_TEAM_ID });
		expect(admin.statisticsProps).toEqual({ ...mergedProps, teamId: PAGE_TEAM_ID });
	});
});
