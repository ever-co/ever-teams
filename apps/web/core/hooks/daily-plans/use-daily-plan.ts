'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useUserQuery } from '../queries/user-user.query';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function useDailyPlan(defaultEmployeeId: string = '') {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const targetEmployeeId = defaultEmployeeId || user?.employee?.id;
	// const [taskId, setTaskId] = useState('');
	const [employeeId, setEmployeeId] = useState(targetEmployeeId || '');
	const queryClient = useQueryClient();

	// Keep employeeId in sync with targetEmployeeId unless intentionally overridden elsewhere
	useEffect(() => {
		if (targetEmployeeId && targetEmployeeId !== employeeId) {
			setEmployeeId(targetEmployeeId);
		}
	}, [targetEmployeeId, employeeId]);
	// Queries
	const getDayPlansByEmployeeQuery = useQuery({
		queryKey: queryKeys.dailyPlans.byEmployee(targetEmployeeId, activeTeam?.id),
		queryFn: async () => {
			if (!targetEmployeeId) {
				throw new Error('Employee ID is required to fetch daily plans');
			}
			const res = await dailyPlanService.getDayPlansByEmployee({ employeeId: targetEmployeeId });
			return res;
		},
		enabled: !!targetEmployeeId,
		gcTime: 1000 * 60 * 60 // 1 hour
	});

	const getMyDailyPlansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.myPlans(activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getMyDailyPlans();
			return res;
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	const getAllDayPlansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getAllDayPlans();
			return res;
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	const { loading: getPlansByTaskQueryLoading, queryCall: getPlansByTaskQuery } = useQueryCall((taskId: string) =>
		queryClient.fetchQuery({
			queryKey: queryKeys.dailyPlans.byTask(taskId),
			queryFn: async () => {
				const res = await dailyPlanService.getPlansByTask({ taskId });
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
				if (process.env.NODE_ENV === 'development') {
					console.log(
						'[Daily Plans] Profile plans synchronized:',
						getMyDailyPlansQuery.data.items?.length || 0,
						'plans'
					);
				}
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
		async (newEmployeeId: string) => {
			try {
				if (newEmployeeId && typeof newEmployeeId === 'string') {
					// Update the employeeId state to trigger query refetch
					setEmployeeId(newEmployeeId);

					// Wait for the query to refetch with the new employeeId
					const res = await queryClient.fetchQuery({
						queryKey: queryKeys.dailyPlans.byEmployee(newEmployeeId, activeTeam?.id),
						queryFn: async () => {
							const result = await dailyPlanService.getDayPlansByEmployee({ employeeId: newEmployeeId });
							return result;
						}
					});

					return res;
				} else {
					throw new Error('Employee ID should be a string');
				}
			} catch (error) {
				console.error(`Error when fetching day plans for employee: ${newEmployeeId}`, error);
				return null; // Return null on error to maintain consistent return type
			}
		},
		[queryClient, activeTeam?.id]
	);

	const loadCurrentEmployeeDayPlans = useCallback(async () => {
		if (targetEmployeeId) {
			const employeeDayPlans = await getEmployeeDayPlans(targetEmployeeId);

			if (employeeDayPlans) {
				setEmployeePlans(employeeDayPlans.items);
				setProfileDailyPlans(employeeDayPlans);
			}
		}
	}, [getEmployeeDayPlans, setEmployeePlans, setProfileDailyPlans, targetEmployeeId]);

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
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

		return (profileDailyPlans.items ?? []).filter((plan) => {
			if (!plan.date) return false;
			const planTime = new Date(plan.date).getTime();
			return planTime >= startOfToday && planTime < startOfTomorrow;
		});
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
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

		// Build a Set of task IDs from today/future to avoid repeated linear searches (O(1) lookup)
		const usedIds = new Set<string>([...todayTasks, ...futureTasks].map((t: TTask) => t.id));

		return (
			(profileDailyPlans.items ?? [])
				// Strictly past plans only (numeric comparison)
				.filter((plan) => new Date(plan.date).getTime() < startOfToday)
				.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
				.map((plan) => ({
					...plan,
					// Keep only non-completed tasks not already scheduled today/future (single pass)
					tasks: (plan.tasks ?? []).filter(
						(task: TTask) => task.status !== 'completed' && !usedIds.has(task.id)
					)
				}))
				// Drop any plans with no remaining tasks
				.filter((plan) => plan.tasks.length > 0)
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
