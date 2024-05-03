'use client';

import { useRecoilState } from 'recoil';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { dailyPlanFetchingState, dailyPlanListState, userState } from '@app/stores';
import { createDailyPlanAPI, getAllDayPlansAPI, getDayPlansByEmployeeAPI } from '@app/services/client/api';
import { ICreateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useDailyPlan() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getDayPlansByEmployeeAPI);
	const { loading: getAllDayPlansLoading, queryCall: getAllQueryCall } = useQuery(getAllDayPlansAPI);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);

	const [dailyPlan, setDailyPlan] = useRecoilState(dailyPlanListState);
	const [dailyPlanFetching, setDailyPlanFetching] = useRecoilState(dailyPlanFetchingState);
	const { firstLoadData: firstLoadDailyPlanData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setDailyPlanFetching(loading);
		}
	}, [loading, firstLoad, setDailyPlanFetching]);

	const getAllDayPlans = useCallback(() => {
		getAllQueryCall().then((response) => {
			if (response.data.items.length) {
				const { items, total } = response.data;
				setDailyPlan({ items, total });
			}
		});
	}, [getAllQueryCall, setDailyPlan]);

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

		getAllDayPlans,
		getAllDayPlansLoading,

		getEmployeeDayPlans,
		loading,

		createDailyPlan,
		createDailyPlanLoading
	};
}
