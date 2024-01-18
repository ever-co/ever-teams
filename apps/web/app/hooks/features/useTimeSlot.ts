'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState, useRecoilValue } from 'recoil';
import { timeSlotsState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { deleteTimerLogsRequestAPI, getTimerLogsRequestAPI } from '@app/services/client/api';
import { useUserProfilePage } from './useUserProfilePage';
import { activityTypeState } from '@app/stores/activity-type';

export function useTimeSlots(hasFilter?: boolean) {
	const { user } = useAuthenticateUser();
	const [timeSlots, setTimeSlots] = useRecoilState(timeSlotsState);
	const activityFilter = useRecoilValue(activityTypeState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQuery(getTimerLogsRequestAPI);
	const { loading: loadingDelete, queryCall: queryDeleteCall } = useQuery(deleteTimerLogsRequestAPI);

	const getTimeSlots = useCallback(() => {
		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();
		const employeeId = hasFilter ? activityFilter.member?.employeeId : profile.member?.employeeId;
		if (profile.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
			queryCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				employeeId: employeeId ?? '',
				todayEnd,
				todayStart
			}).then((response) => {
				if (response.data) {
					// @ts-expect-error
					setTimeSlots(response.data[0].timeSlots);
				}
			});
		}
	}, [
		hasFilter,
		activityFilter.member?.employeeId,
		profile.member?.employeeId,
		profile.userProfile?.id,
		user?.id,
		user?.role?.name,
		user?.tenantId,
		user?.employee.organizationId,
		queryCall,
		setTimeSlots
	]);

	const deleteTimeSlots = useCallback(
		(ids: string[]) => {
			queryDeleteCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				ids: ids
			}).then(() => {
				const updatedSlots = timeSlots.filter((el) => (!ids?.includes(el.id) ? el : null));
				setTimeSlots(updatedSlots);
			});
		},
		[queryDeleteCall, setTimeSlots, timeSlots, user]
	);

	useEffect(() => {
		getTimeSlots();
	}, [getTimeSlots]);

	return {
		timeSlots,
		getTimeSlots,
		deleteTimeSlots,
		loadingDelete,
		loading
	};
}
