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
	const profile = useUserProfilePage();
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useRecoilState(timeAppsState);
	const [visitedAppDetail, setVisitedAppDetail] = useRecoilState(timeAppVisitedDetail);
	const [visitedSites, setVisitedSites] = useRecoilState(timeVisitedSitesState);

	const { loading, queryCall } = useQuery(getTimerDailyRequestAPI);

	const getVisitedApps = useCallback(
		({ title }: { title?: string }) => {
			const todayStart = moment().startOf('day').toDate();
			const todayEnd = moment().endOf('day').toDate();
			const employeeId = profile.member?.employeeId ?? '';
			if (profile.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER') {
				queryCall({
					tenantId: user?.tenantId ?? '',
					organizationId: user?.employee.organizationId ?? '',
					employeeId: employeeId,
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
			profile.member?.employeeId,
			profile.userProfile?.id,
			user?.id,
			user?.role?.name,
			user?.tenantId,
			user?.employee.organizationId,
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
