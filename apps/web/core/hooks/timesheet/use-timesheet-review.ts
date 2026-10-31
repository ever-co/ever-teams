'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { organizationTeamsState } from '@/core/stores';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	canApproveAnyTimesheet,
	getAllowedTimesheetStatuses,
	type TimesheetReviewer
} from '@/core/lib/helpers/timesheet-review';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * The timesheet statuses the signed-in user may set, read from the permissions of their role and the teams the app
 * already loaded for them (see getAllowedTimesheetStatuses).
 */
export function useTimesheetReview() {
	const { myPermissions } = useMyRolePermissionsQuery();
	const { data: user } = useUserQuery();
	const teams = useAtomValue(organizationTeamsState);
	const employeeId = user?.employee?.id;

	const reviewer = useMemo<TimesheetReviewer>(
		() => ({ permissions: myPermissions, employeeId, teams }),
		[myPermissions, employeeId, teams]
	);

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

	const approvesAnyTimesheet = canApproveAnyTimesheet(myPermissions);

	return { canApproveAnyTimesheet: approvesAnyTimesheet, canApproveAndReject, getAllowedStatuses };
}
