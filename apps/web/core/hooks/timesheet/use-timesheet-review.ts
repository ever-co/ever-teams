'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { organizationTeamsState } from '@/core/stores';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	canApproveAnyTimesheet,
	getAllowedTimesheetStatuses,
	membershipEmployeeIdOf,
	type TimesheetReviewer
} from '@/core/lib/helpers/timesheet-review';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam } from '@/core/types/schemas';

/**
 * The memberships the review rule reads, for every team: who, whether they manage, whether it is in effect. "Who" is
 * read as the rule reads it (membershipEmployeeIdOf), so a team read without `employeeId` still changes the reviewer
 * when another member takes a place.
 */
function reviewMembershipsSignatureOf(teams: readonly TOrganizationTeam[]): string {
	const teamSignatures = teams.map((team) => {
		const members = team.members ?? [];
		const memberSignatures = members.map(
			(member) => `${membershipEmployeeIdOf(member)}:${member.isManager}:${member.isActive}:${member.isArchived}`
		);
		return `${team.id}=${memberSignatures.join(',')}`;
	});
	return teamSignatures.join('|');
}

function haveSameReviewMemberships(previous: TOrganizationTeam[], next: TOrganizationTeam[]): boolean {
	const previousSignature = reviewMembershipsSignatureOf(previous);
	const nextSignature = reviewMembershipsSignatureOf(next);
	return previousSignature === nextSignature;
}

// The teams are written again whenever a member's timer changes; the reviewer only changes with a membership
const reviewTeamsState = selectAtom(organizationTeamsState, (teams) => teams, haveSameReviewMemberships);

/**
 * The reviewer getAllowedTimesheetStatuses reads: the permissions of the signed-in user's role, their employee and
 * the teams the app already loaded for them. It keeps its identity while the teams only refresh their timers.
 */
export function useTimesheetReviewer(): TimesheetReviewer {
	const { myPermissions } = useMyRolePermissionsQuery();
	const { data: user } = useUserQuery();
	const teams = useAtomValue(reviewTeamsState);
	const employeeId = user?.employee?.id;

	return useMemo<TimesheetReviewer>(
		() => ({ permissions: myPermissions, employeeId, teams }),
		[myPermissions, employeeId, teams]
	);
}

/**
 * The timesheet statuses the signed-in user may set, read from the permissions of their role and the teams the app
 * already loaded for them (see getAllowedTimesheetStatuses).
 */
export function useTimesheetReview() {
	const reviewer = useTimesheetReviewer();

	const getAllowedStatuses = useCallback(
		(logs: readonly ITimeLog[]) => getAllowedTimesheetStatuses(reviewer, logs),
		[reviewer]
	);

	const canApproveAndReject = useCallback(
		(logs: readonly ITimeLog[]) => {
			const allowedStatuses = getAllowedTimesheetStatuses(reviewer, logs);
			const canApprove = allowedStatuses.includes(ETimesheetStatus.APPROVED);
			const canReject = allowedStatuses.includes(ETimesheetStatus.DENIED);
			return canApprove && canReject;
		},
		[reviewer]
	);

	const approvesAnyTimesheet = canApproveAnyTimesheet(reviewer.permissions);

	return { canApproveAnyTimesheet: approvesAnyTimesheet, canApproveAndReject, getAllowedStatuses };
}
