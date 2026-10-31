import type { TOrganizationTeam } from '@/core/types/schemas';
import type { UseReportActivityProps } from './use-activity-filters';

// The module also exports hooks built on these; the helper under test is pure
jest.mock('@/core/hooks/auth', () => ({ useAuthenticateUser: jest.fn() }));
jest.mock('./use-timelog-filter-options', () => ({ useTimelogFilterOptions: jest.fn() }));

import { getActivityQueryKeyParams, getAppliedTeamsReportProps } from './use-activity-filters';

const APPLIED_TEAM_ID = 'applied-team';

// Time & Activity after Apply Filter with a team and no member, for a team manager
const mergedProps = {
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	startDate: '2026-10-19',
	endDate: '2026-10-25',
	employeeIds: [],
	teamIds: [APPLIED_TEAM_ID],
	projectIds: [],
	selectedEmployeeIds: [],
	selectedTeamIds: [APPLIED_TEAM_ID]
} as unknown as Required<UseReportActivityProps>;

function buildTeam(members: Array<{ employeeId: string; isActive?: boolean; isArchived?: boolean }>) {
	return { id: APPLIED_TEAM_ID, members } as unknown as TOrganizationTeam;
}

function buildActiveMembers(count: number) {
	return Array.from({ length: count }, (_, index) => ({ employeeId: `employee-${index}` }));
}

describe('getAppliedTeamsReportProps', () => {
	it('names the active members of the teams a manager applies with no member', () => {
		const team = buildTeam([
			{ employeeId: 'manager' },
			{ employeeId: 'member-1' },
			{ employeeId: 'left', isActive: false },
			{ employeeId: 'archived', isArchived: true }
		]);

		const reportProps = getAppliedTeamsReportProps(mergedProps, [team], false);

		expect(reportProps).toEqual({
			...mergedProps,
			employeeIds: ['manager', 'member-1'],
			resolvedMemberIds: ['manager', 'member-1']
		});
	});

	it('keeps the request of a team with more than 20 active members', () => {
		const team = buildTeam(buildActiveMembers(21));

		const reportProps = getAppliedTeamsReportProps(mergedProps, [team], false);

		expect(reportProps).toBe(mergedProps);
	});

	it('keeps the request of an applied member, of an unmanaged team and of an organization-wide viewer', () => {
		const team = buildTeam(buildActiveMembers(3));
		const memberProps = { ...mergedProps, employeeIds: ['employee-1'], selectedEmployeeIds: ['employee-1'] };

		const withAppliedMember = getAppliedTeamsReportProps(memberProps, [team], false);
		const withUnmanagedTeam = getAppliedTeamsReportProps(mergedProps, [], false);
		const forOrganizationWideViewer = getAppliedTeamsReportProps(mergedProps, [team], true);

		expect(withAppliedMember).toBe(memberProps);
		expect(withUnmanagedTeam).toBe(mergedProps);
		expect(forOrganizationWideViewer).toBe(mergedProps);
	});

	it('changes the report query key when the membership of the applied team changes', () => {
		const team = buildTeam(buildActiveMembers(3));
		const remainingMembers = buildActiveMembers(2);
		const teamAfterArchive = buildTeam([...remainingMembers, { employeeId: 'employee-2', isArchived: true }]);

		const reportProps = getAppliedTeamsReportProps(mergedProps, [team], false);
		const reportPropsAfterArchive = getAppliedTeamsReportProps(mergedProps, [teamAfterArchive], false);
		const queryKey = getActivityQueryKeyParams(reportProps);
		const queryKeyAfterArchive = getActivityQueryKeyParams(reportPropsAfterArchive);

		expect(queryKeyAfterArchive).not.toEqual(queryKey);
	});

	it('keeps the report query key when the applied team lists its members in another order', () => {
		const team = buildTeam([{ employeeId: 'member-b' }, { employeeId: 'member-a' }]);
		const teamInOtherOrder = buildTeam([{ employeeId: 'member-a' }, { employeeId: 'member-b' }]);

		const reportProps = getAppliedTeamsReportProps(mergedProps, [team], false);
		const reportPropsInOtherOrder = getAppliedTeamsReportProps(mergedProps, [teamInOtherOrder], false);
		const queryKey = getActivityQueryKeyParams(reportProps);
		const queryKeyInOtherOrder = getActivityQueryKeyParams(reportPropsInOtherOrder);

		expect(queryKeyInOtherOrder).toEqual(queryKey);
	});
});
