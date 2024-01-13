'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState } from 'recoil';
import { timeAppsState, timeVisitedSitesState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { getTimerDailyRequestAPI } from '@app/services/client/api';

export function useTimeDailyActivity(type: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useRecoilState(timeAppsState);
	const [visitedSites, setVisitedSites] = useRecoilState(timeVisitedSitesState);

	const { loading, queryCall } = useQuery(getTimerDailyRequestAPI);

	const getVisitedApps = useCallback(() => {
		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();

		queryCall({
			tenantId: user?.tenantId ?? '',
			organizationId: user?.employee.organizationId ?? '',
			employeeId: user?.employee.id ?? '',
			todayEnd,
			type,
			todayStart
		})
			.then((response) => {
				if (response.data) {
					if (type == 'APP') setVisitedApps(response.data);
					else setVisitedSites(response.data);
				}
			})
			.catch((err) => console.log(err));
	}, [queryCall, setVisitedApps, setVisitedSites, user, type]);

	useEffect(() => {
		getVisitedApps();
	}, [user, getVisitedApps]);

	return {
		visitedApps,
		visitedSites,
		getVisitedApps,
		loading
	};
}
