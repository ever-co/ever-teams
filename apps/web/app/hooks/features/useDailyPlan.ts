'use client';

import { useRecoilState } from 'recoil';
import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import {
	dailyPlanFetchingState,
	dailyPlanListState,
	employeePlansListState,
	myDailyPlanListState,
	profileDailyPlanListState,
	taskPlans,
	userState
} from '@app/stores';
import {
	addTaskToPlanAPI,
	createDailyPlanAPI,
	deleteDailyPlanAPI,
	getAllDayPlansAPI,
	getDayPlansByEmployeeAPI,
	getMyDailyPlansAPI,
	getPlansByTaskAPI,
	removeTaskFromPlanAPI,
	updateDailyPlanAPI
} from '@app/services/client/api';
import { ICreateDailyPlan, IDailyPlanTasksUpdate, IUpdateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useDailyPlan() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getDayPlansByEmployeeAPI);
	const { loading: getAllDayPlansLoading, queryCall: getAllQueryCall } = useQuery(getAllDayPlansAPI);
	const { loading: getMyDailyPlansLoading, queryCall: getMyDailyPlansQueryCall } = useQuery(getMyDailyPlansAPI);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);
	const { loading: updateDailyPlanLoading, queryCall: updateQueryCall } = useQuery(updateDailyPlanAPI);
	const { loading: getPlansByTaskLoading, queryCall: getPlansByTaskQueryCall } = useQuery(getPlansByTaskAPI);
	const { loading: addTaskToPlanLoading, queryCall: addTaskToPlanQueryCall } = useQuery(addTaskToPlanAPI);
	const { loading: removeTaskFromPlanLoading, queryCall: removeTAskFromPlanQueryCall } =
		useQuery(removeTaskFromPlanAPI);
	const { loading: deleteDailyPlanLoading, queryCall: deleteDailyPlanQueryCall } = useQuery(deleteDailyPlanAPI);

	const [dailyPlan, setDailyPlan] = useRecoilState(dailyPlanListState);
	const [myDailyPlans, setMyDailyPlans] = useRecoilState(myDailyPlanListState);
	const [profileDailyPlans, setProfileDailyPlans] = useRecoilState(profileDailyPlanListState);
	const [employeePlans, setEmployeePlans] = useRecoilState(employeePlansListState);
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

	const getMyDailyPlans = useCallback(() => {
		getMyDailyPlansQueryCall().then((response) => {
			if (response.data.items.length) {
				const { items, total } = response.data;
				setMyDailyPlans({ items, total });
			}
		});
	}, [getMyDailyPlansQueryCall, setMyDailyPlans]);

	const getEmployeeDayPlans = useCallback(
		(employeeId: string) => {
			queryCall(employeeId).then((response) => {
				const { items, total } = response.data;
				setProfileDailyPlans({ items, total });
				setEmployeePlans(items);
			});
		},
		[queryCall, setEmployeePlans, setProfileDailyPlans]
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
				setProfileDailyPlans({
					total: profileDailyPlans.total + 1,
					items: [...profileDailyPlans.items, res.data]
				});
				setEmployeePlans([...employeePlans, res.data]);
				getMyDailyPlans();
				return res;
			}
		},
		[
			createQueryCall,
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans,
			setEmployeePlans,
			setProfileDailyPlans,
			user?.tenantId
		]
	);

	const updateDailyPlan = useCallback(
		async (data: IUpdateDailyPlan, planId: string) => {
			const res = await updateQueryCall(data, planId);
			const updated = profileDailyPlans.items.filter((plan) => plan.id != planId);
			const updatedEmployee = employeePlans.filter((plan) => plan.id != planId);
			setProfileDailyPlans({ total: profileDailyPlans.total, items: [...updated, res.data] });
			setEmployeePlans([...updatedEmployee, res.data]);
			return res;
		},
		[employeePlans, profileDailyPlans, setEmployeePlans, setProfileDailyPlans, updateQueryCall]
	);

	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			const res = await addTaskToPlanQueryCall(data, planId);
			const updated = profileDailyPlans.items.filter((plan) => plan.id != planId);
			const updatedEmployee = employeePlans.filter((plan) => plan.id != planId);
			setProfileDailyPlans({ total: profileDailyPlans.total, items: [...updated, res.data] });
			setEmployeePlans([...updatedEmployee, res.data]);
			getMyDailyPlans();
			return res;
		},
		[
			addTaskToPlanQueryCall,
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans,
			setEmployeePlans,
			setProfileDailyPlans
		]
	);

	const removeTaskFromPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			const res = await removeTAskFromPlanQueryCall(data, planId);
			const updated = profileDailyPlans.items.filter((plan) => plan.id != planId);
			const updatedEmployee = employeePlans.filter((plan) => plan.id != planId);
			setProfileDailyPlans({ total: profileDailyPlans.total, items: [...updated, res.data] });
			setEmployeePlans([...updatedEmployee, res.data]);
			getMyDailyPlans();
			return res;
		},
		[
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans,
			removeTAskFromPlanQueryCall,
			setEmployeePlans,
			setProfileDailyPlans
		]
	);

	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			const res = await deleteDailyPlanQueryCall(planId);
			const updated = profileDailyPlans.items.filter((plan) => plan.id != planId);
			const updatedEmployee = employeePlans.filter((plan) => plan.id != planId);
			setProfileDailyPlans({ total: updated.length, items: [...updated] });
			setEmployeePlans([...updatedEmployee]);

			getMyDailyPlans();

			return res;
		},
		[
			deleteDailyPlanQueryCall,
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans.items,
			setEmployeePlans,
			setProfileDailyPlans
		]
	);

	useEffect(() => {
		getMyDailyPlans();
	}, [getMyDailyPlans]);

	return {
		dailyPlan,
		setDailyPlan,

		profileDailyPlans,
		setProfileDailyPlans,
		dailyPlanFetching,

		employeePlans,
		setEmployeePlans,

		taskPlanList,

		firstLoadDailyPlanData,

		getAllDayPlans,
		getAllDayPlansLoading,

		myDailyPlans,
		getMyDailyPlans,
		getMyDailyPlansLoading,

		getEmployeeDayPlans,
		loading,

		getPlansByTask,
		getPlansByTaskLoading,

		createDailyPlan,
		createDailyPlanLoading,

		updateDailyPlan,
		updateDailyPlanLoading,

		addTaskToPlan,
		addTaskToPlanLoading,

		removeTaskFromPlan,
		removeTaskFromPlanLoading,

		deleteDailyPlan,
		deleteDailyPlanLoading
	};
}
