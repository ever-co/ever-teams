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

import { getActivityQueryKeyParams } from './use-activity-filters';
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

function renderProps(
	team: TOrganizationTeam,
	props: Required<UseReportActivityProps>,
	otherManagedTeams: TOrganizationTeam[] = []
) {
	const managedTeams = [team, ...otherManagedTeams];

	mockUserManagedTeams = managedTeams;
	mockUseAtomValue.mockImplementation((atom: unknown) => {
		if (atom === 'organization-teams') return managedTeams;
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

		expect(reportProps).toEqual({
			...countsProps,
			employeeIds: ['manager', 'member-1'],
			resolvedMemberIds: ['page-team:manager', 'page-team:member-1']
		});
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

		expect(picked.reportProps).toEqual({
			...pickedProps,
			teamId: PAGE_TEAM_ID,
			resolvedMemberIds: ['page-team:employee-0', 'page-team:employee-1', 'page-team:employee-2']
		});
		expect(picked.statisticsProps).toEqual({ ...pickedProps, teamId: PAGE_TEAM_ID });

		mockUser = { role: { name: 'ADMIN' } };

		const admin = renderProps(team, mergedProps);

		expect(admin.reportProps).toEqual({ ...mergedProps, teamId: PAGE_TEAM_ID });
		expect(admin.statisticsProps).toEqual({ ...mergedProps, teamId: PAGE_TEAM_ID });
	});

	it('keys the chart and daily report on the managed team members, which a pick in the filter does not change', () => {
		const team = buildTeam(buildActiveMembers(3));
		const remainingMembers = buildActiveMembers(2);
		const teamAfterArchive = buildTeam([...remainingMembers, { employeeId: 'employee-2', isArchived: true }]);
		const otherTeam = {
			id: 'other-team',
			members: [{ employeeId: 'other-member' }]
		} as unknown as TOrganizationTeam;
		const memberPickProps = { ...mergedProps, employeeIds: ['employee-1'] };
		const teamPickProps = { ...mergedProps, teamIds: ['other-team'] };

		// A pick does not change which teams the user manages, so every render manages both teams
		const scoped = renderProps(team, mergedProps, [otherTeam]);
		const afterArchive = renderProps(teamAfterArchive, mergedProps, [otherTeam]);
		const withMemberPick = renderProps(team, memberPickProps, [otherTeam]);
		const withTeamPick = renderProps(team, teamPickProps, [otherTeam]);

		const queryKey = getActivityQueryKeyParams(scoped.reportProps);
		const queryKeyAfterArchive = getActivityQueryKeyParams(afterArchive.reportProps);
		const queryKeyWithMemberPick = getActivityQueryKeyParams(withMemberPick.reportProps);
		const queryKeyWithTeamPick = getActivityQueryKeyParams(withTeamPick.reportProps);

		expect(queryKeyAfterArchive).not.toEqual(queryKey);
		expect(queryKeyWithMemberPick).toEqual(queryKey);
		expect(queryKeyWithTeamPick).toEqual(queryKey);
	});

	it('changes the chart and daily report key when the membership of a picked team changes', () => {
		const team = buildTeam(buildActiveMembers(3));
		const pickedTeam = {
			id: 'picked-team',
			members: [{ employeeId: 'picked-member' }, { employeeId: 'leaving-member' }]
		} as unknown as TOrganizationTeam;
		const pickedTeamAfterArchive = {
			id: 'picked-team',
			members: [{ employeeId: 'picked-member' }, { employeeId: 'leaving-member', isArchived: true }]
		} as unknown as TOrganizationTeam;
		const teamPickProps = { ...mergedProps, teamIds: ['picked-team'] };

		const beforeArchive = renderProps(team, teamPickProps, [pickedTeam]);
		const afterArchive = renderProps(team, teamPickProps, [pickedTeamAfterArchive]);

		const queryKey = getActivityQueryKeyParams(beforeArchive.reportProps);
		const queryKeyAfterArchive = getActivityQueryKeyParams(afterArchive.reportProps);

		expect(afterArchive.reportProps?.employeeIds).toEqual(['picked-member']);
		expect(queryKeyAfterArchive).not.toEqual(queryKey);
	});

	it('changes the chart and daily report key when a member moves from the page team to another managed team', () => {
		const team = buildTeam([{ employeeId: 'moving-member' }, { employeeId: 'manager' }]);
		const teamAfterMove = buildTeam([{ employeeId: 'manager' }]);
		const otherTeam = {
			id: 'other-team',
			members: [{ employeeId: 'other-member' }]
		} as unknown as TOrganizationTeam;
		// A member added to a team goes at the end of its list, right before the page team in id order
		const otherTeamAfterMove = {
			id: 'other-team',
			members: [{ employeeId: 'other-member' }, { employeeId: 'moving-member' }]
		} as unknown as TOrganizationTeam;

		const beforeMove = renderProps(team, mergedProps, [otherTeam]);
		const afterMove = renderProps(teamAfterMove, mergedProps, [otherTeamAfterMove]);

		const queryKey = getActivityQueryKeyParams(beforeMove.reportProps);
		const queryKeyAfterMove = getActivityQueryKeyParams(afterMove.reportProps);

		expect(afterMove.reportProps?.employeeIds).toEqual(['manager']);
		expect(queryKeyAfterMove).not.toEqual(queryKey);
	});

	it('keeps the chart and daily report key when the managed teams come in another order', () => {
		const team = buildTeam(buildActiveMembers(3));
		const otherTeam = {
			id: 'other-team',
			members: [{ employeeId: 'other-member' }]
		} as unknown as TOrganizationTeam;

		const listed = renderProps(team, mergedProps, [otherTeam]);

		// The next poll of the team list returns the same teams in another order
		mockUserManagedTeams = [otherTeam, team];

		const { result } = renderHook(() =>
			useTeamDashboardStatisticsProps({ mergedProps, isManage: true, routeTeamId: PAGE_TEAM_ID })
		);
		const queryKey = getActivityQueryKeyParams(listed.reportProps);
		const queryKeyInOtherOrder = getActivityQueryKeyParams(result.current.reportProps);

		expect(queryKeyInOtherOrder).toEqual(queryKey);
	});

	it('keeps the chart and daily report key when a team lists its members in another order', () => {
		const team = buildTeam([{ employeeId: 'member-b' }, { employeeId: 'manager' }, { employeeId: 'member-a' }]);
		// The next poll of the team list returns the same members in another order
		const teamInOtherOrder = buildTeam([
			{ employeeId: 'member-a' },
			{ employeeId: 'member-b' },
			{ employeeId: 'manager' }
		]);

		const listed = renderProps(team, mergedProps);
		const listedInOtherOrder = renderProps(teamInOtherOrder, mergedProps);

		const queryKey = getActivityQueryKeyParams(listed.reportProps);
		const queryKeyInOtherOrder = getActivityQueryKeyParams(listedInOtherOrder.reportProps);

		expect(queryKeyInOtherOrder).toEqual(queryKey);
	});

	it('keeps the chart and daily report key when a member of the page team picks a team they manage', () => {
		const team = buildTeam(buildActiveMembers(3));
		const managedTeam = {
			id: 'managed-team',
			members: [{ employeeId: 'managed-member' }]
		} as unknown as TOrganizationTeam;
		const teamPickProps = { ...mergedProps, teamIds: ['managed-team'] };

		// The user belongs to the page team without managing it, and manages another team
		mockUserManagedTeams = [managedTeam];
		mockUseAtomValue.mockImplementation((atom: unknown) => {
			if (atom === 'organization-teams') return [team, managedTeam];
			return team;
		});

		const { result, rerender } = renderHook(
			(props: Required<UseReportActivityProps>) =>
				useTeamDashboardStatisticsProps({ mergedProps: props, isManage: false, routeTeamId: PAGE_TEAM_ID }),
			{ initialProps: mergedProps }
		);
		const queryKey = getActivityQueryKeyParams(result.current.reportProps);

		rerender(teamPickProps);

		const queryKeyWithTeamPick = getActivityQueryKeyParams(result.current.reportProps);

		expect(result.current.reportProps?.employeeIds).toEqual(['managed-member']);
		expect(queryKeyWithTeamPick).toEqual(queryKey);
	});
});
