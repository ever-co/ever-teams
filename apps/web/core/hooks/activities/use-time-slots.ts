'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../common/use-query';
import { useAtom, useAtomValue } from 'jotai';
import { timeSlotsState } from '@/core/stores/timer/time-slot';
import moment from 'moment';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { timeSlotService } from '@/core/services/client/api/timesheets/time-slot.service';
import { useAuthenticateUser } from '../auth';
import { useUserProfilePage } from '../users';

export function useTimeSlots(hasFilter?: boolean) {
	const { user } = useAuthenticateUser();
	const [timeSlots, setTimeSlots] = useAtom(timeSlotsState);
	const activityFilter = useAtomValue(activityTypeState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQuery(statisticsService.getTimerLogsRequest);
	const { loading: loadingDelete, queryCall: queryDeleteCall } = useQuery(timeSlotService.deleteTimeSlots);

	const getTimeSlots = useCallback(() => {
		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();
		const employeeId = activityFilter.member ? activityFilter.member?.employeeId : user?.employee?.id;
		if (activityFilter.member?.employeeId === user?.employee?.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
			queryCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee?.organizationId ?? '',
				employeeId: employeeId ?? '',
				todayEnd,
				todayStart
			}).then((response) => {
				if (response?.data && Array.isArray(response.data)) {
					setTimeSlots(response.data[0]?.timeSlots || []);
				}
			});
		} else setTimeSlots([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasFilter, activityFilter.member?.employeeId, profile.member?.employeeId, user?.id, queryCall, setTimeSlots]);

	const deleteTimeSlots = useCallback(
		(ids: string[]) => {
			queryDeleteCall({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee?.organizationId ?? '',
				ids: ids
			}).then(() => {
				setTimeSlots((timeSlots) => timeSlots.filter((el) => (!ids?.includes(el.id) ? el : null)));
			});
		},
		[queryDeleteCall, setTimeSlots, user]
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
