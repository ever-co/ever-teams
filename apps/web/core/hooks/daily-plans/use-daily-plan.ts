'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import {
	activeTeamState,
	dailyPlanListState,
	employeePlansListState,
	myDailyPlanListState,
	profileDailyPlanListState,
	taskPlans
} from '@/core/stores';
import {
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { useFirstLoad } from '../common/use-first-load';
import { dailyPlanService } from '../../services/client/api';
import { useAuthenticateUser } from '../auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';
import {
	TCreateDailyPlan,
	TDailyPlanTasksUpdate,
	TRemoveTaskFromPlansRequest,
	TUpdateDailyPlan
} from '@/core/types/schemas/task/daily-plan.schema';
import { useConditionalUpdateEffect, useQueryCall } from '../common';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function useDailyPlan() {
	const { user } = useAuthenticateUser();
	const activeTeam = useAtomValue(activeTeamState);
	// const [taskId, setTaskId] = useState('');
	const [employeeId, setEmployeeId] = useState('');
	const queryClient = useQueryClient();

	// Queries
	const getDayPlansByEmployeeQuery = useQuery({
		queryKey: queryKeys.dailyPlans.byEmployee(user?.employee?.id, activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getDayPlansByEmployee(user?.employee?.id, activeTeam?.id);
			return res;
		},
		enabled: !!user?.employee?.id && !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	const getMyDailyPlansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.myPlans(activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getMyDailyPlans(activeTeam?.id);
			return res;
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	const getAllDayPlansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getAllDayPlans(activeTeam?.id);
			return res;
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	const { loading: getPlansByTaskQueryLoading, queryCall: getPlansByTaskQuery } = useQueryCall((taskId: string) =>
		queryClient.fetchQuery({
			queryKey: queryKeys.dailyPlans.byTask(taskId),
			queryFn: async () => {
				const res = await dailyPlanService.getPlansByTask(taskId);
				return res;
			},
			gcTime: 1000 * 60 * 60
		})
	);

	// Mutations
	const createDailyplanMutation = useMutation({
		mutationFn: async (data: TCreateDailyPlan) => {
			const res = await dailyPlanService.createDailyPlan(data);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const updateDailyPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TUpdateDailyPlan }) => {
			const res = await dailyPlanService.updateDailyPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const addTaskToPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TDailyPlanTasksUpdate }) => {
			const res = await dailyPlanService.addTaskToPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const removeTaskFromPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeTaskFromPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const removeTaskPlansMutation = useMutation({
		mutationFn: async ({ taskId, data }: { taskId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeManyTaskFromPlans({ taskId, data });
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const deleteDailyPlanMutation = useMutation({
		mutationFn: async (dailyPlanId: string) => {
			const res = await dailyPlanService.deleteDailyPlan(dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	const invalidateDailyPlanData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.myPlans(activeTeam?.id)
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id)
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.byEmployee(employeeId, activeTeam?.id)
		});
	}, [activeTeam?.id, employeeId, queryClient]);

	const [dailyPlan, setDailyPlan] = useAtom(dailyPlanListState);
	const [myDailyPlans, setMyDailyPlans] = useAtom(myDailyPlanListState);
	const [profileDailyPlans, setProfileDailyPlans] = useAtom(profileDailyPlanListState);
	const [employeePlans, setEmployeePlans] = useAtom(employeePlansListState);
	const [taskPlanList, setTaskPlans] = useAtom(taskPlans);
	const { firstLoadData: firstLoadDailyPlanData } = useFirstLoad();

	// Sync jotai state
	useConditionalUpdateEffect(
		() => {
			if (getDayPlansByEmployeeQuery.data?.items) {
				setEmployeePlans(getDayPlansByEmployeeQuery.data?.items);
			}
		},
		[getDayPlansByEmployeeQuery.data?.items, setEmployeePlans],
		Boolean(employeePlans?.length)
	);

	useConditionalUpdateEffect(
		() => {
			if (getMyDailyPlansQuery.data) {
				setMyDailyPlans(getMyDailyPlansQuery.data);
			}
		},
		[getMyDailyPlansQuery.data, setMyDailyPlans],
		Boolean(myDailyPlans?.items?.length)
	);

	useConditionalUpdateEffect(
		() => {
			if (getAllDayPlansQuery.data) {
				setDailyPlan(getAllDayPlansQuery.data);
			}
		},
		[getAllDayPlansQuery.data, setDailyPlan],
		Boolean(dailyPlan?.items?.length)
	);

	useConditionalUpdateEffect(
		() => {
			if (getMyDailyPlansQuery.data) {
				setProfileDailyPlans(getMyDailyPlansQuery.data);
			}
		},
		[getMyDailyPlansQuery.data, setProfileDailyPlans],
		Boolean(profileDailyPlans?.items?.length)
	);

	// All day plans
	const getAllDayPlans = useCallback(async () => {
		try {
			const res = await getAllDayPlansQuery.refetch();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching all day plans');
			}
		} catch (error) {
			console.error('Error fetching all day plans:', error);
		}
	}, [getAllDayPlansQuery]);

	const loadAllDayPlans = useCallback(async () => {
		const allDayPlans = await getAllDayPlansQuery.refetch();

		if (allDayPlans?.data) {
			setDailyPlan(allDayPlans.data);
		}
	}, [getAllDayPlansQuery, setDailyPlan]);

	// My day plans

	const getMyDailyPlans = useCallback(async () => {
		try {
			const res = await getMyDailyPlansQuery.refetch();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching my daily plans');
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [getMyDailyPlansQuery]);

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
					setEmployeeId(employeeId);
					const res = await getDayPlansByEmployeeQuery.refetch();

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
		[getDayPlansByEmployeeQuery]
	);

	const loadCurrentEmployeeDayPlans = useCallback(async () => {
		if (user?.employee?.id) {
			const employeeDayPlans = await getEmployeeDayPlans(user?.employee?.id);

			if (employeeDayPlans) {
				setEmployeePlans(employeeDayPlans.items);
				setProfileDailyPlans(employeeDayPlans);
			}
		}
	}, [getEmployeeDayPlans, setEmployeePlans, setProfileDailyPlans, user?.employee?.id]);

	const getPlansByTask = useCallback(
		async (taskId?: string) => {
			try {
				if (taskId) {
					const res = await getPlansByTaskQuery(taskId);
					if (res) {
						setTaskPlans(res.items);
					}
				} else {
					return;
				}
			} catch (error) {
				console.error('Error fetching plans by task:', error);
			}
		},
		[getPlansByTaskQuery, setTaskPlans]
	);

	const createDailyPlan = useCallback(
		async (data: TCreateDailyPlan) => {
			if (user?.tenantId) {
				return await createDailyplanMutation.mutateAsync({ ...data, organizationTeamId: activeTeam?.id });
			}
		},
		[createDailyplanMutation, user?.tenantId, activeTeam?.id]
	);

	const updateDailyPlan = useCallback(
		async (data: TUpdateDailyPlan, planId: string) => {
			return await updateDailyPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[updateDailyPlanMutation]
	);

	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await addTaskToPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[addTaskToPlanMutation]
	);

	const removeTaskFromPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await removeTaskFromPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[removeTaskFromPlanMutation]
	);

	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlansRequest, taskId: string) => {
			return await removeTaskPlansMutation.mutateAsync({ data, taskId });
		},
		[removeTaskPlansMutation]
	);

	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			return await deleteDailyPlanMutation.mutateAsync(planId);
		},
		[deleteDailyPlanMutation]
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
					tasks: plan.tasks?.filter((task: TTask) => task.status !== 'completed')
				}))
				.map((plan) => ({
					...plan,
					// Include only tasks that are not added yet to the today plan or future plans
					tasks: plan.tasks?.filter(
						(_task: TTask) => ![...todayTasks, ...futureTasks].find((task: TTask) => task.id === _task.id)
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
		await loadCurrentEmployeeDayPlans();
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans, loadCurrentEmployeeDayPlans, loadMyDailyPlans]);

	return {
		dailyPlan,
		setDailyPlan,

		profileDailyPlans,
		setProfileDailyPlans,

		employeePlans,
		setEmployeePlans,

		taskPlanList,

		getAllDayPlans,
		getAllDayPlansLoading: getAllDayPlansQuery.isLoading,

		myDailyPlans,
		getMyDailyPlans,
		getMyDailyPlansLoading: getMyDailyPlansQuery.isLoading,

		getEmployeeDayPlans,
		getDayPlansByEmployeeLoading: getDayPlansByEmployeeQuery.isLoading,

		getPlansByTask,
		getPlansByTaskLoading: getPlansByTaskQueryLoading,

		createDailyPlan,
		createDailyPlanLoading: createDailyplanMutation.isPending,

		updateDailyPlan,
		updateDailyPlanLoading: updateDailyPlanMutation.isPending,

		addTaskToPlan,
		addTaskToPlanLoading: addTaskToPlanMutation.isPending,

		removeTaskFromPlan,
		removeTaskFromPlanLoading: removeTaskFromPlanMutation.isPending,

		removeManyTaskPlans,
		removeManyTaskFromPlanLoading: removeTaskPlansMutation.isPending,

		deleteDailyPlan,
		deleteDailyPlanLoading: deleteDailyPlanMutation.isPending,

		futurePlans,
		pastPlans,
		outstandingPlans,
		todayPlan,
		sortedPlans,

		loadAllDayPlans,
		loadMyDailyPlans,
		loadEmployeeDayPlans: loadCurrentEmployeeDayPlans,
		firstLoadDailyPlanData: handleFirstLoad
	};
}
