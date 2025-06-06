'use client';

import { useCallback, useEffect } from 'react';
import { useQueryCall } from '../common/use-query';
import { useAtom, useAtomValue } from 'jotai';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { taskTimesheetState } from '@/core/stores/tasks/task-timesheet';
import { activityService } from '@/core/services/client/api/activities';
import { useAuthenticateUser } from '../auth';
import { useUserProfilePage } from '../users';

export function useTaskTimeSheets(id: string) {
	const { user } = useAuthenticateUser();
	const [taskTimesheets, setTaskTimesheets] = useAtom(taskTimesheetState);
	const activityFilter = useAtomValue(activityTypeState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQueryCall(activityService.getActivities);
	const getTaskTimesheets = useCallback(() => {
		if (activityFilter.member?.employeeId === user?.employee?.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
			queryCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee?.organizationId ?? '',
				taskId: id
			}).then((response) => {
				if (response.data) {
					console.log(response.data);
					setTaskTimesheets(response.data);
				}
			});
		} else setTaskTimesheets([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activityFilter.member?.employeeId, profile.member?.employeeId, user?.id, queryCall, setTaskTimesheets]);

	useEffect(() => {
		getTaskTimesheets();
	}, [getTaskTimesheets]);

	return {
		taskTimesheets,
		getTaskTimesheets,
		loading,
		loadTaskStatsIObserverRef: profile.loadTaskStatsIObserverRef
	};
}
