'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState, useRecoilValue } from 'recoil';

import { useAuthenticateUser } from './useAuthenticateUser';
import { useUserProfilePage } from './useUserProfilePage';
import { activityTypeState } from '@app/stores/activity-type';
import { taskTimesheetState } from '@app/stores/task-timesheet';
import { getTaskTimesheetRequestAPI } from '@app/services/client/api';

export function useTaskTimeSheets() {
	const { user } = useAuthenticateUser();
	const [taskTimesheets, setTaskTimesheets] = useRecoilState(taskTimesheetState);
	const activityFilter = useRecoilValue(activityTypeState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQuery(getTaskTimesheetRequestAPI);
	const getTaskTimesheets = useCallback(() => {
		if (activityFilter.member?.employeeId === user?.employee.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
			queryCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				taskId: ''
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
		loading
	};
}
