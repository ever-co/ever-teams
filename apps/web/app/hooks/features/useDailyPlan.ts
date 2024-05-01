'use client';

import { useRecoilState } from 'recoil';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { dailyPlanFetchingState, dailyPlanListState, userState } from '@app/stores';
import { createDailyPlanAPI } from '@app/services/client/api';
import { ICreateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useDailyPlan() {
	const [user] = useRecoilState(userState);

	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);

	const [dailyPlan, setDailyPlan] = useRecoilState(dailyPlanListState);
	const [dailyPlanFetching, setDailyPlanFetching] = useRecoilState(dailyPlanFetchingState);
	const { firstLoadData: firstLoadDailyPlanData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setDailyPlanFetching(createDailyPlanLoading); // Change this after provided getDailyPlan handlers
		}
	}, [createDailyPlanLoading, firstLoad, setDailyPlanFetching]); // Update loading var after provided getDailyPlan handlers

	const createDailyPlan = useCallback(
		async (data: ICreateDailyPlan) => {
			const res = await createQueryCall(data, user?.tenantId || '');
			return res;
		},
		[createQueryCall, user]
	);

	return {
		dailyPlan,
		setDailyPlan,
		dailyPlanFetching,
		firstLoadDailyPlanData,
		createDailyPlan,
		createDailyPlanLoading
	};
}
