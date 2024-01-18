'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState, useRecoilValue } from 'recoil';
import { timeAppsState, timeVisitedSitesState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { getTimerDailyRequestAPI } from '@app/services/client/api';
import { activityTypeState } from '@app/stores/activity-type';

export function useTimeDailyActivity(type?: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useRecoilState(timeAppsState);
	const activityFilter = useRecoilValue(activityTypeState);
	const [visitedSites, setVisitedSites] = useRecoilState(timeVisitedSitesState);

	const { loading, queryCall } = useQuery(getTimerDailyRequestAPI);

	const getVisitedApps = useCallback(
		(title?: string) => {
			const todayStart = moment().startOf('day').toDate();
			const todayEnd = moment().endOf('day').toDate();
			const employeeId = activityFilter.member ? activityFilter.member?.employeeId : user?.employee?.id;
			if (
				activityFilter.member?.employeeId === user?.employee.id ||
				user?.role?.name?.toUpperCase() == 'MANAGER'
			) {
				queryCall({
					tenantId: user?.tenantId ?? '',
					organizationId: user?.employee.organizationId ?? '',
					employeeId: employeeId ?? '',
					todayEnd,
					type,
					todayStart,
					title
				})
					.then((response) => {
						if (response.data) {
							// @ts-ignore
							// if (title) setVisitedAppDetail(response.data[0]);
							if (type == 'APP') setVisitedApps(response.data);
							else setVisitedSites(response.data);
						}
					})
					.catch((err) => console.log(err));
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[queryCall, type]
	);

	useEffect(() => {
		getVisitedApps();
	}, [getVisitedApps]);

	return {
		visitedApps,
		visitedSites,
		// visitedAppDetail,
		getVisitedApps,
		loading
	};
}
