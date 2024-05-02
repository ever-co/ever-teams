'use client';

import { useRecoilState } from 'recoil';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { dailyPlanFetchingState, dailyPlanListState, userState } from '@app/stores';
import { createDailyPlanAPI, getDayPlansByEmployeeAPI } from '@app/services/client/api';
import { ICreateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useDailyPlan() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getDayPlansByEmployeeAPI);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);

	const [dailyPlan, setDailyPlan] = useRecoilState(dailyPlanListState);
	const [dailyPlanFetching, setDailyPlanFetching] = useRecoilState(dailyPlanFetchingState);
	const { firstLoadData: firstLoadDailyPlanData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setDailyPlanFetching(loading);
		}
	}, [loading, firstLoad, setDailyPlanFetching]);

	const getEmployeeDayPlans = useCallback(
		(employeeId: string) => {
			queryCall(employeeId).then((response) => {
				if (response.data.items.length) {
					const { items, total } = response.data;
					setDailyPlan({ items, total });
				}
			});
		},
		[queryCall, setDailyPlan]
	);

	const createDailyPlan = useCallback(
		async (data: ICreateDailyPlan) => {
			if (user?.tenantId) {
				const res = await createQueryCall(data, user?.tenantId || '');
				return res;
			}
		},
		[createQueryCall, user]
	);

	return {
		dailyPlan,
		setDailyPlan,
		dailyPlanFetching,
		firstLoadDailyPlanData,
		createDailyPlan,
		loading,
		getEmployeeDayPlans,
		createDailyPlanLoading
	};
}
