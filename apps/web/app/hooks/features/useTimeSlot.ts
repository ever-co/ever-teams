'use client';

import { IUser } from '@app/interfaces';
import { getTimerLogsRequestAPI } from '@app/services/client/api/timer/timer-slot';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState } from 'recoil';
import { timeSlotsState } from '@app/stores/time-slot';
import moment from 'moment';

export function useTimeSlots(user: IUser | undefined | null) {
	const [timeSlots, setTimeSlots] = useRecoilState(timeSlotsState);

	const { loading, queryCall } = useQuery(getTimerLogsRequestAPI);

	const getTimeSlots = useCallback(() => {
		const todayStart = moment().startOf('day').toLocaleString();
		const todayEnd = moment().endOf('day').toLocaleString();
		queryCall(todayStart, todayEnd).then((response) => {
			if (response.data?.timeSlots?.length) {
				setTimeSlots(response.data.timeSlots);
			}
		});
	}, [queryCall, setTimeSlots]);

	useEffect(() => {
		getTimeSlots();
	}, [user, getTimeSlots]);

	return {
		timeSlots,
		getTimeSlots,
		loading
	};
}
