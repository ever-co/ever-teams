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
	taskPlans
} from '@app/stores';
import {
	addTaskToPlanAPI,
	createDailyPlanAPI,
	deleteDailyPlanAPI,
	getAllDayPlansAPI,
	getDayPlansByEmployeeAPI,
	getMyDailyPlansAPI,
	getPlansByTaskAPI,
	removeManyTaskFromPlansAPI,
	removeTaskFromPlanAPI,
	updateDailyPlanAPI
} from '@app/services/client/api';
import { ICreateDailyPlan, IDailyPlanTasksUpdate, IRemoveTaskFromManyPlans, IUpdateDailyPlan } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';
import { useAuthenticateUser } from './useAuthenticateUser';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function useDailyPlan() {
	const { user } = useAuthenticateUser();

	const { loading, queryCall } = useQuery(getDayPlansByEmployeeAPI);
	const { loading: getAllDayPlansLoading, queryCall: getAllQueryCall } = useQuery(getAllDayPlansAPI);
	const { loading: getMyDailyPlansLoading, queryCall: getMyDailyPlansQueryCall } = useQuery(getMyDailyPlansAPI);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQuery(createDailyPlanAPI);
	const { loading: updateDailyPlanLoading, queryCall: updateQueryCall } = useQuery(updateDailyPlanAPI);
	const { loading: getPlansByTaskLoading, queryCall: getPlansByTaskQueryCall } = useQuery(getPlansByTaskAPI);
	const { loading: addTaskToPlanLoading, queryCall: addTaskToPlanQueryCall } = useQuery(addTaskToPlanAPI);
	const { loading: removeTaskFromPlanLoading, queryCall: removeTAskFromPlanQueryCall } =
		useQuery(removeTaskFromPlanAPI);
	const { loading: removeManyTaskFromPlanLoading, queryCall: removeManyTaskPlanQueryCall } =
		useQuery(removeManyTaskFromPlansAPI);

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
				//Check if there is an existing plan
				const isPlanExist = profileDailyPlans.items.find((plan) =>
					plan.date?.toString()?.startsWith(new Date(data.date)?.toISOString().split('T')[0])
				);
				if (isPlanExist) {
					const updatedPlans = profileDailyPlans.items.map((plan) => {
						if (plan.date?.toString()?.startsWith(new Date(data.date)?.toISOString().split('T')[0])) {
							return res.data;
						}

						return plan;
					});

					setProfileDailyPlans({
						total: updatedPlans.length,
						items: updatedPlans
					});
				} else {
					setProfileDailyPlans({
						total: profileDailyPlans.total + 1,
						items: [...profileDailyPlans.items, res.data]
					});
				}

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

	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlans, taskId: string) => {
			const res = await removeManyTaskPlanQueryCall({ taskId, data });
			const updatedProfileDailyPlans = profileDailyPlans.items
				.map((plan) => {
					const updatedTasks = plan.tasks ? plan.tasks.filter((task) => task.id !== taskId) : [];
					return { ...plan, tasks: updatedTasks };
				})
				.filter((plan) => plan.tasks && plan.tasks.length > 0);
			// Delete plans without tasks
			const updatedEmployeePlans = employeePlans
				.map((plan) => {
					const updatedTasks = plan.tasks ? plan.tasks.filter((task) => task.id !== taskId) : [];
					return { ...plan, tasks: updatedTasks };
				})
				.filter((plan) => plan.tasks && plan.tasks.length > 0);

			setProfileDailyPlans({
				total: profileDailyPlans.total,
				items: updatedProfileDailyPlans
			});
			setEmployeePlans(updatedEmployeePlans);
			getMyDailyPlans();
			return res;
		},
		[
			removeManyTaskPlanQueryCall,
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans,
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

	const ascSortedPlans =
		profileDailyPlans.items &&
		[...profileDailyPlans.items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const futurePlans = ascSortedPlans?.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
		return planDate.getTime() >= today.getTime();
	});

	const descSortedPlans =
		profileDailyPlans.items &&
		[...profileDailyPlans.items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	const pastPlans = descSortedPlans?.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
		return planDate.getTime() < today.getTime();
	});

	const todayPlan =
		profileDailyPlans.items &&
		[...profileDailyPlans.items].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);

	const todayTasks = todayPlan
		.map((plan) => {
			return plan.tasks ? plan.tasks : [];
		})
		.flat();

	const futureTasks =
		futurePlans &&
		futurePlans
			.map((plan) => {
				return plan.tasks ? plan.tasks : [];
			})
			.flat();

	const outstandingPlans =
		profileDailyPlans.items &&
		[...profileDailyPlans.items]
			// Exclude today plans
			.filter((plan) => !plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]))

			// Exclude future plans
			.filter((plan) => {
				const planDate = new Date(plan.date);
				const today = new Date();
				today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
				return planDate.getTime() <= today.getTime();
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.map((plan) => ({
				...plan,
				// Include only no completed tasks
				tasks: plan.tasks?.filter((task) => task.status !== 'completed')
			}))
			.map((plan) => ({
				...plan,
				// Include only tasks that are not added yet to the today plan or future plans
				tasks: plan.tasks?.filter(
					(_task) => ![...todayTasks, ...futureTasks].find((task) => task.id === _task.id)
				)
			}))
			.filter((plan) => plan.tasks?.length && plan.tasks.length > 0);

	const sortedPlans =
		profileDailyPlans.items &&
		[...profileDailyPlans.items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	useEffect(() => {
		if (firstLoad) {
			getMyDailyPlans();
			getAllDayPlans();
		}
	}, [getMyDailyPlans, getAllDayPlans, firstLoad]);

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

		removeManyTaskPlans,
		removeManyTaskFromPlanLoading,

		deleteDailyPlan,
		deleteDailyPlanLoading,

		futurePlans,
		pastPlans,
		outstandingPlans,
		todayPlan,
		sortedPlans
	};
}
