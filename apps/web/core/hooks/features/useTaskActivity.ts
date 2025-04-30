'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useAtom, useAtomValue } from 'jotai';

import { useAuthenticateUser } from './useAuthenticateUser';
import { useUserProfilePage } from './useUserProfilePage';
import { activityTypeState } from '@/core/stores/activity-type';
import { taskTimesheetState } from '@/core/stores/task-timesheet';
import { getTaskTimesheetRequestAPI } from '@/core/services/client/api';

export function useTaskTimeSheets(id: string) {
	const { user } = useAuthenticateUser();
	const [taskTimesheets, setTaskTimesheets] = useAtom(taskTimesheetState);
	const activityFilter = useAtomValue(activityTypeState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQuery(getTaskTimesheetRequestAPI);
	const getTaskTimesheets = useCallback(() => {
		if (activityFilter.member?.employeeId === user?.employee.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
			queryCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
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
