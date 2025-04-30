'use client';

import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useCallback, useEffect } from 'react';

import { getTimerDailyRequestAPI } from '@/core/services/client/api';
import { activityTypeState } from '@/core/stores/activity-type';
import { timeAppsState, timeVisitedSitesState } from '@/core/stores/time-slot';

import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';

export function useTimeDailyActivity(type?: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useAtom(timeAppsState);
	const activityFilter = useAtomValue(activityTypeState);
	const [visitedSites, setVisitedSites] = useAtom(timeVisitedSitesState);

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
			} else {
				if (type == 'APP') setVisitedApps([]);
				else setVisitedSites([]);
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
