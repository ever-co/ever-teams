'use client';

import { useRecoilState } from 'recoil';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { dailyPlanFetchingState, dailyPlanListState, taskPlans, userState } from '@app/stores';
import {
	createDailyPlanAPI,
	getAllDayPlansAPI,
	getDayPlansByEmployeeAPI,
	getPlansByTaskAPI,
	updateDailyPlanAPI
} from '@app/services/client/api';
import { ICreateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useDailyPlan() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getDayPlansByEmployeeAPI);
	const { loading: getAllDayPlansLoading, queryCall: getAllQueryCall } = useQuery(getAllDayPlansAPI);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);
	const { loading: updateDailyPlanLoading, queryCall: updateQueryCall } = useQuery(updateDailyPlanAPI);
	const { loading: getPlansByTaskLoading, queryCall: getPlansByTaskQueryCall } = useQuery(getPlansByTaskAPI);

	const [dailyPlan, setDailyPlan] = useRecoilState(dailyPlanListState);
	const [taskPlanList, setTaskPlans] = useRecoilState(taskPlans);
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
				if (response.data?.items?.length) {
					const { items, total } = response.data;
					setDailyPlan({ items, total });
				}
			});
		},
		[queryCall, setDailyPlan]
	);

	const getPlansByTask = useCallback(
		(taskId?: string) => {
			getPlansByTaskQueryCall(taskId).then((response) => {
				setTaskPlans(response.data.items);
			});
		},
		[getPlansByTaskQueryCall, setTaskPlans]
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

	const updateDailyPlan = useCallback(
		async (data: Partial<ICreateDailyPlan>, planId: string) => {
			const updated = dailyPlan.items.filter((plan) => plan.id != planId);
			const res = await updateQueryCall(data, planId);
			setDailyPlan({ total: dailyPlan.total, items: [...updated, res.data] });
			return res;
		},
		[dailyPlan.items, dailyPlan.total, setDailyPlan, updateQueryCall]
	);

	return {
		dailyPlan,
		setDailyPlan,
		dailyPlanFetching,

		taskPlanList,

		firstLoadDailyPlanData,

		getAllDayPlans,
		getAllDayPlansLoading,

		getEmployeeDayPlans,
		loading,

		getPlansByTask,
		getPlansByTaskLoading,

		createDailyPlan,
		createDailyPlanLoading,

		updateDailyPlan,
		updateDailyPlanLoading
	};
}
