'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState } from 'recoil';
import { timeSlotsState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { getTimerLogsRequestAPI } from '@app/services/client/api/timesheet/statistics/time-slots/route';

export function useTimeSlots() {
	const { user } = useAuthenticateUser();
	const [timeSlots, setTimeSlots] = useRecoilState(timeSlotsState);

	const { loading, queryCall } = useQuery(getTimerLogsRequestAPI);

	const getTimeSlots = useCallback(() => {
		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();
		console.log({ todayStart, todayEnd });
		queryCall({
			tenantId: user?.tenantId ?? '',
			organizationId: user?.employee.organizationId ?? '',
			employeeId: user?.employee.id ?? '',
			todayEnd,
			todayStart
		}).then((response) => {
			if (response.data?.timeSlots?.length) {
				setTimeSlots(response.data.timeSlots);
			}
		});
	}, [queryCall, setTimeSlots, user]);

	useEffect(() => {
		getTimeSlots();
	}, [user, getTimeSlots]);

	return {
		timeSlots,
		getTimeSlots,
		loading
	};
}
