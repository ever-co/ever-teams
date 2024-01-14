'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useRecoilState } from 'recoil';
import { timeAppVisitedDetail, timeAppsState, timeVisitedSitesState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import { getTimerDailyRequestAPI } from '@app/services/client/api';
import { useUserProfilePage } from './useUserProfilePage';

export function useTimeDailyActivity(type: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useRecoilState(timeAppsState);
	const [visitedAppDetail, setVisitedAppDetail] = useRecoilState(timeAppVisitedDetail);
	const [visitedSites, setVisitedSites] = useRecoilState(timeVisitedSitesState);
	const profile = useUserProfilePage();

	const { loading, queryCall } = useQuery(getTimerDailyRequestAPI);

	const getVisitedApps = useCallback(
		({ userId, title }: { userId?: string; title?: string }) => {
			const todayStart = moment().startOf('day').toDate();
			const todayEnd = moment().endOf('day').toDate();
			if (profile.userProfile?.id === user?.id) {
				queryCall({
					tenantId: user?.tenantId ?? '',
					organizationId: user?.employee.organizationId ?? '',
					employeeId: userId ?? user?.employee.id ?? '',
					todayEnd,
					type,
					todayStart,
					title
				})
					.then((response) => {
						if (response.data) {
							// @ts-ignore
							if (title) setVisitedAppDetail(response.data[0]);
							else if (type == 'APP') setVisitedApps(response.data);
							else setVisitedSites(response.data);
						}
					})
					.catch((err) => console.log(err));
			}
		},
		[
			profile.userProfile?.id,
			user?.id,
			user?.tenantId,
			user?.employee.organizationId,
			user?.employee.id,
			queryCall,
			type,
			setVisitedAppDetail,
			setVisitedApps,
			setVisitedSites
		]
	);

	useEffect(() => {
		getVisitedApps({});
	}, [user, getVisitedApps]);

	return {
		visitedApps,
		visitedSites,
		visitedAppDetail,
		getVisitedApps,
		loading
	};
}
