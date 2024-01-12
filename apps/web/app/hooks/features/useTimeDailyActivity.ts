'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState } from 'recoil';
import { timeAppsState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { getTimerDailyRequestAPI } from '@app/services/client/api';

export function useTimeDailyActivity(type: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useRecoilState(timeAppsState);

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
					console.log(response.data);
					setVisitedApps(response.data);
				}
			})
			.catch((err) => console.log(err));
	}, [queryCall, setVisitedApps, user, type]);

	useEffect(() => {
		getVisitedApps();
	}, [user, getVisitedApps]);

	return {
		visitedApps,
		getVisitedApps,
		loading
	};
}
