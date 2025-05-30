'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { useQueryCall } from '../common/use-query';
import {
	activeTeamState,
	dailyPlanListState,
	employeePlansListState,
	myDailyPlanListState,
	profileDailyPlanListState,
	taskPlans
} from '@/core/stores';
import {
	ICreateDailyPlan,
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest,
	IUpdateDailyPlan
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { useFirstLoad } from '../common/use-first-load';
import { removeDuplicateItems } from '@/core/lib/utils/remove-duplicate-item';
import { dailyPlanService } from '../../services/client/api';
import { useAuthenticateUser } from '../auth';
import { ITask } from '@/core/types/interfaces/task/task';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function useDailyPlan() {
	const { user } = useAuthenticateUser();
	const activeTeam = useAtomValue(activeTeamState);

	const { loading: getDayPlansByEmployeeLoading, queryCall: getDayPlansByEmployeeQueryCall } = useQueryCall(
		dailyPlanService.getDayPlansByEmployee
	);
	const { loading: getAllDayPlansLoading, queryCall: getAllDayPlansQueryCall } = useQueryCall(
		dailyPlanService.getAllDayPlans
	);
	const { loading: getMyDailyPlansLoading, queryCall: getMyDailyPlansQueryCall } = useQueryCall(
		dailyPlanService.getMyDailyPlans
	);
	const { loading: createDailyPlanLoading, queryCall: createQueryCall } = useQueryCall(
		dailyPlanService.createDailyPlan
	);
	const { loading: updateDailyPlanLoading, queryCall: updateQueryCall } = useQueryCall(
		dailyPlanService.updateDailyPlan
	);
	const { loading: getPlansByTaskLoading, queryCall: getPlansByTaskQueryCall } = useQueryCall(
		dailyPlanService.getPlansByTask
	);
	const { loading: addTaskToPlanLoading, queryCall: addTaskToPlanQueryCall } = useQueryCall(
		dailyPlanService.addTaskToPlan
	);
	const { loading: removeTaskFromPlanLoading, queryCall: removeTaskFromPlanQueryCall } = useQueryCall(
		dailyPlanService.removeTaskFromPlan
	);
	const { loading: removeManyTaskFromPlanLoading, queryCall: removeManyTaskPlanQueryCall } = useQueryCall(
		dailyPlanService.removeManyTaskFromPlans
	);

	const { loading: deleteDailyPlanLoading, queryCall: deleteDailyPlanQueryCall } = useQueryCall(
		dailyPlanService.deleteDailyPlan
	);

	const [dailyPlan, setDailyPlan] = useAtom(dailyPlanListState);
	const [myDailyPlans, setMyDailyPlans] = useAtom(myDailyPlanListState);
	const [profileDailyPlans, setProfileDailyPlans] = useAtom(profileDailyPlanListState);
	const [employeePlans, setEmployeePlans] = useAtom(employeePlansListState);
	const [taskPlanList, setTaskPlans] = useAtom(taskPlans);
	const { firstLoadData: firstLoadDailyPlanData } = useFirstLoad();

	// All day plans

	const getAllDayPlans = useCallback(async () => {
		try {
			const res = await getAllDayPlansQueryCall();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching all day plans');
			}
		} catch (error) {
			console.error('Error fetching all day plans:', error);
		}
	}, [getAllDayPlansQueryCall]);

	const loadAllDayPlans = useCallback(async () => {
		const allDayPlans = await getAllDayPlans();

		if (allDayPlans) {
			setDailyPlan(allDayPlans);
		}
	}, [getAllDayPlans, setDailyPlan]);

	// My day plans

	const getMyDailyPlans = useCallback(async () => {
		try {
			const res = await getMyDailyPlansQueryCall();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching my daily plans');
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [getMyDailyPlansQueryCall]);

	const loadMyDailyPlans = useCallback(async () => {
		const myDailyPlans = await getMyDailyPlans();

		if (myDailyPlans) {
			setMyDailyPlans(myDailyPlans);
		}
	}, [getMyDailyPlans, setMyDailyPlans]);

	// Employee day plans

	const getEmployeeDayPlans = useCallback(
		async (employeeId: string) => {
			try {
				if (employeeId && typeof employeeId === 'string') {
					const res = await getDayPlansByEmployeeQueryCall(employeeId);

					if (res) {
						return res.data;
					} else {
						console.error('Error fetching day plans by employee:', employeeId);
					}
				} else {
					throw new Error('Employee ID should be a string');
				}
			} catch (error) {
				console.error(`Error when fetching day plans for employee: ${employeeId}`, error);
			}
		},
		[getDayPlansByEmployeeQueryCall]
	);

	const loadEmployeeDayPlans = useCallback(async () => {
		if (user?.employee?.id) {
			const employeeDayPlans = await getEmployeeDayPlans(user?.employee?.id);

			if (employeeDayPlans) {
				setEmployeePlans(employeeDayPlans.items);
				setProfileDailyPlans(employeeDayPlans);
			}
		}
	}, [getEmployeeDayPlans, setEmployeePlans, setProfileDailyPlans, user?.employee?.id]);

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
				const res = await createQueryCall(
					{
						...data,
						organizationTeamId: activeTeam?.id,
						employeeId: user?.employee?.id
					},
					user?.tenantId || ''
				);
				//Check if there is an existing plan
				const isPlanExist = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].find((plan) =>
					plan.date?.toString()?.startsWith(new Date(data.date)?.toISOString().split('T')[0])
				);
				if (isPlanExist) {
					const updatedPlans = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].map((plan) => {
						if (plan.date?.toString()?.startsWith(new Date(data.date)?.toISOString().split('T')[0])) {
							return { ...res.data, tasks: removeDuplicateItems(res.data.tasks) };
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
						items: [
							...(profileDailyPlans.items ? profileDailyPlans.items : []),
							{ ...res.data, tasks: removeDuplicateItems(res.data.tasks) }
						]
					});
				}

				setEmployeePlans([
					...(employeePlans ? employeePlans : []),
					{ ...res.data, tasks: removeDuplicateItems(res.data.tasks) }
				]);
				getMyDailyPlans();
				return res;
			}
		},
		[
			activeTeam?.id,
			createQueryCall,
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans.items,
			profileDailyPlans.total,
			setEmployeePlans,
			setProfileDailyPlans,
			user?.employee?.id,
			user?.tenantId
		]
	);

	const updateDailyPlan = useCallback(
		async (data: IUpdateDailyPlan, planId: string) => {
			const res = await updateQueryCall(data, planId);
			const updated = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter(
				(plan) => plan.id != planId
			);
			const updatedEmployee = [...(employeePlans ? employeePlans : [])].filter((plan) => plan.id != planId);
			setProfileDailyPlans({
				total: profileDailyPlans.total,
				items: [...updated, res.data]
			});
			setEmployeePlans([...updatedEmployee, res.data]);
			// Fetch updated plans
			getMyDailyPlans();
			getAllDayPlans();
			return res;
		},
		[
			employeePlans,
			getAllDayPlans,
			getMyDailyPlans,
			profileDailyPlans.items,
			profileDailyPlans.total,
			setEmployeePlans,
			setProfileDailyPlans,
			updateQueryCall
		]
	);

	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			const res = await addTaskToPlanQueryCall(data, planId);
			const updated = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter(
				(plan) => plan.id != planId
			);
			const updatedEmployee = [...(employeePlans ? employeePlans : [])].filter((plan) => plan.id != planId);
			setProfileDailyPlans({
				total: profileDailyPlans.total,
				items: [...updated, res.data]
			});
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
			const res = await removeTaskFromPlanQueryCall(data, planId);
			const updated = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter(
				(plan) => plan.id != planId
			);
			const updatedEmployee = [...(employeePlans ? employeePlans : [])].filter((plan) => plan.id != planId);
			setProfileDailyPlans({
				total: profileDailyPlans.total,
				items: [...updated, res.data]
			});
			setEmployeePlans([...updatedEmployee, res.data]);
			getMyDailyPlans();
			return res;
		},
		[
			employeePlans,
			getMyDailyPlans,
			profileDailyPlans,
			removeTaskFromPlanQueryCall,
			setEmployeePlans,
			setProfileDailyPlans
		]
	);

	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlansRequest, taskId: string) => {
			const res = await removeManyTaskPlanQueryCall({ taskId, data });
			const updatedProfileDailyPlans = [...(profileDailyPlans.items ? profileDailyPlans.items : [])]
				.map((plan) => {
					const updatedTasks = plan.tasks ? plan.tasks.filter((task: ITask) => task.id !== taskId) : [];
					return { ...plan, tasks: updatedTasks };
				})
				.filter((plan) => plan.tasks && plan.tasks.length > 0);
			// Delete plans without tasks
			const updatedEmployeePlans = [...(employeePlans ? employeePlans : [])]
				.map((plan) => {
					const updatedTasks = plan.tasks ? plan.tasks.filter((task: ITask) => task.id !== taskId) : [];
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
			const updated = [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter(
				(plan) => plan.id != planId
			);
			const updatedEmployee = [...(employeePlans ? employeePlans : [])].filter((plan) => plan.id != planId);
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

	const ascSortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
	}, [profileDailyPlans]);

	const futurePlans = useMemo(() => {
		return ascSortedPlans?.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
			return planDate.getTime() >= today.getTime();
		});
	}, [ascSortedPlans]);

	const descSortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [profileDailyPlans]);

	const pastPlans = useMemo(() => {
		return descSortedPlans?.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
			return planDate.getTime() < today.getTime();
		});
	}, [descSortedPlans]);

	const todayPlan = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);
	}, [profileDailyPlans]);

	const todayTasks = useMemo(() => {
		return todayPlan
			.map((plan) => {
				return plan.tasks ? plan.tasks : [];
			})
			.flat();
	}, [todayPlan]);

	const futureTasks = useMemo(() => {
		return futurePlans
			.map((plan) => {
				return plan.tasks ? plan.tasks : [];
			})
			.flat();
	}, [futurePlans]);

	const outstandingPlans = useMemo(() => {
		return (
			[...(profileDailyPlans.items ? profileDailyPlans.items : [])]
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
					tasks: plan.tasks?.filter((task: ITask) => task.status !== 'completed')
				}))
				.map((plan) => ({
					...plan,
					// Include only tasks that are not added yet to the today plan or future plans
					tasks: plan.tasks?.filter(
						(_task: ITask) => ![...todayTasks, ...futureTasks].find((task: ITask) => task.id === _task.id)
					)
				}))
				.filter((plan) => plan.tasks?.length && plan.tasks.length > 0)
		);
	}, [profileDailyPlans, todayTasks, futureTasks]);

	const sortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
	}, [profileDailyPlans]);

	const handleFirstLoad = useCallback(async () => {
		await loadAllDayPlans();
		await loadMyDailyPlans();
		await loadEmployeeDayPlans();
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans, loadEmployeeDayPlans, loadMyDailyPlans]);

	return {
		dailyPlan,
		setDailyPlan,

		profileDailyPlans,
		setProfileDailyPlans,

		employeePlans,
		setEmployeePlans,

		taskPlanList,

		getAllDayPlans,
		getAllDayPlansLoading,

		myDailyPlans,
		getMyDailyPlans,
		getMyDailyPlansLoading,

		getEmployeeDayPlans,
		getDayPlansByEmployeeLoading,

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
		sortedPlans,

		loadAllDayPlans,
		loadMyDailyPlans,
		loadEmployeeDayPlans,
		firstLoadDailyPlanData: handleFirstLoad
	};
}
