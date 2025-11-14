'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { activeTeamState, dailyPlanListState, tasksByTeamState } from '@/core/stores';
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
	TDailyPlan,
	TDailyPlanTasksUpdate,
	TRemoveTaskFromPlansRequest,
	TUpdateDailyPlan
} from '@/core/types/schemas/task/daily-plan.schema';
import { useConditionalUpdateEffect, useQueryCall } from '../common';
import { useUserQuery } from '../queries/user-user.query';
import { toast } from 'sonner';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function useDailyPlan(defaultEmployeeId: string | null = null) {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const targetEmployeeId = defaultEmployeeId || user?.employee?.id;
	const [employeeId, setEmployeeId] = useState(targetEmployeeId || '');
	const queryClient = useQueryClient();
	const allTeamTasks = useAtomValue(tasksByTeamState);

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
		onSuccess: () => {
			invalidateDailyPlanData();
		},
		onError: (error) => {
			toast.error('Failed to create daily plan', {
				description: getErrorMessage(error, 'Failed to create daily plan')
			});
			logErrorInDev('Failed to create daily plan', error);
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
		onSuccess: () => {
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
			queryKey: queryKeys.dailyPlans.byEmployee(targetEmployeeId, activeTeam?.id)
		});
	}, [activeTeam?.id, targetEmployeeId, queryClient]);

	//  TEAM-WIDE atom - Keep for backward compatibility
	const [dailyPlan, setDailyPlan] = useAtom(dailyPlanListState);
	const { firstLoadData: firstLoadDailyPlanData } = useFirstLoad();

	//  Sync team-wide daily plans (only team-wide atom)
	useConditionalUpdateEffect(
		() => {
			if (getAllDayPlansQuery.data) {
				setDailyPlan(getAllDayPlansQuery.data);
			}
		},
		[getAllDayPlansQuery.data, setDailyPlan],
		Boolean(dailyPlan?.items?.length)
	);

	//  LOCAL data - Calculate profileDailyPlans from React Query.
	//  Per-employee plans are no longer stored in global atoms; they are derived
	//  from queries to keep views in sync (Home modal, Profile tab, etc.).
	const profileDailyPlans = useMemo(() => {
		const isViewingOtherEmployee = targetEmployeeId && targetEmployeeId !== user?.employee?.id;

		return isViewingOtherEmployee
			? getDayPlansByEmployeeQuery.data || { items: [], total: 0 }
			: getMyDailyPlansQuery.data || { items: [], total: 0 };
	}, [targetEmployeeId, user?.employee?.id, getDayPlansByEmployeeQuery.data, getMyDailyPlansQuery.data]);

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

	// Loader function for pre-caching in init-state.tsx
	// Does NOT update atoms - data is available via React Query cache
	const loadMyDailyPlans = useCallback(async () => {
		await getMyDailyPlans();
		// Data is automatically available via React Query cache
	}, [getMyDailyPlans]);

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
		[queryClient, activeTeam?.id, setEmployeeId]
	);

	// Loader function for pre-caching in init-state.tsx
	// Does NOT update atoms - data is available via React Query cache
	const loadEmployeeDayPlans = useCallback(async () => {
		if (targetEmployeeId) {
			await getEmployeeDayPlans(targetEmployeeId);
			// Data is automatically available via React Query cache
		}
	}, [getEmployeeDayPlans, targetEmployeeId]);

	const getPlansByTask = useCallback(
		async (taskId?: string) => {
			try {
				if (taskId) {
					const res = await getPlansByTaskQuery(taskId);
					return res; //  Return data directly instead of setting atom
				} else {
					return;
				}
			} catch (error) {
				console.error('Error fetching plans by task:', error);
			}
		},
		[getPlansByTaskQuery]
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
			// NOTE_FIX: Use > instead of >= to exclude today's plans from future plans
			// Future plans should only include dates AFTER today, not today itself
			return planDate.getTime() > today.getTime();
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
		//  EXACT LOGIC from todayPlanState atom
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);
	}, [profileDailyPlans]);

	const todayTasks = useMemo(() => {
		return todayPlan.flatMap((plan) => plan.tasks ?? []);
	}, [todayPlan]);

	const futureTasks = useMemo(() => {
		return futurePlans.flatMap((plan) => plan.tasks ?? []);
	}, [futurePlans]);

	const outstandingPlans = useMemo(() => {
		// Build a Set of task IDs from today/future to avoid repeated linear searches (O(1) lookup instead of O(n²))
		const usedIds = new Set<string>([...todayTasks, ...futureTasks].map((t: TTask) => t.id));

		// PART 1: Past plans with incomplete tasks not in today/future
		const pastPlansWithIncompleteTasks = [...(profileDailyPlans.items ? profileDailyPlans.items : [])]
			// Exclude today plans
			.filter((plan) => !plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]))
			// Exclude future plans (keep only past plans)
			.filter((plan) => {
				const planDate = new Date(plan.date);
				const today = new Date();
				today.setHours(23, 59, 59, 0);
				return planDate.getTime() <= today.getTime();
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.map((plan) => ({
				...plan,
				// Include only non-completed tasks
				tasks: plan.tasks?.filter((task) => task.status !== 'completed')
			}))
			.map((plan) => ({
				...plan,
				// Include only tasks not added yet to today/future plans
				tasks: plan.tasks?.filter((_task) => !usedIds.has(_task.id))
			}))
			.filter((plan) => plan.tasks?.length && plan.tasks.length > 0);

		// PART 2: Tasks assigned to member that are NOT in ANY plan
		// Build a Set of ALL task IDs that are in ANY plan (today, future, past)
		const allPlannedTaskIds = new Set<string>(
			profileDailyPlans.items?.flatMap((plan) => plan.tasks?.map((t) => t.id) ?? []) ?? []
		);

		// Filter tasks assigned to the target user that are NOT in any plan
		const tasksNotInAnyPlan = allTeamTasks.filter((task) => {
			// Must be assigned to the target user
			const isAssignedToUser = task.members?.some((member) => member.userId === user?.id);
			// Must NOT be in any plan
			const isNotInAnyPlan = !allPlannedTaskIds.has(task.id);
			// Must have time tracked OR estimation set
			const hasTimeOrEstimate =
				(task.totalWorkedTime && task.totalWorkedTime > 0) || (task.estimate && task.estimate > 0);

			return isAssignedToUser && isNotInAnyPlan && hasTimeOrEstimate;
		});

		// Create a virtual plan for tasks not in any plan (if any exist)
		const virtualPlanForUnplannedTasks: TDailyPlan[] =
			tasksNotInAnyPlan.length > 0
				? [
						{
							id: 'outstanding-no-plan',
							date: new Date().toISOString(),
							tasks: tasksNotInAnyPlan,
							workTimePlanned: 0,
							status: 'open',
							tenantId: activeTeam?.tenantId ?? null,
							organizationId: activeTeam?.organizationId ?? null,
							employeeId: targetEmployeeId ?? null,
							employee: null,
							organizationTeamId: activeTeam?.id ?? null,
							organizationTeam: null
						}
					]
				: [];

		// Combine past plans with incomplete tasks + virtual plan for unplanned tasks
		return [...pastPlansWithIncompleteTasks, ...virtualPlanForUnplannedTasks];
	}, [profileDailyPlans, todayTasks, futureTasks, allTeamTasks, user?.id, activeTeam, targetEmployeeId]);

	const sortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
	}, [profileDailyPlans]);

	const handleFirstLoad = useCallback(async () => {
		await loadAllDayPlans();
		//  Data is automatically loaded by React Query - no need to manually load
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans]);

	return {
		//  TEAM-WIDE data (kept for backward compatibility)
		dailyPlan,
		setDailyPlan,

		//  LOCAL data (calculated from React Query)
		profileDailyPlans,

		//  BACKWARD COMPATIBILITY - Alias for components still using myDailyPlans
		myDailyPlans: profileDailyPlans,

		//  EMPLOYEE-SPECIFIC data (from React Query, not atoms)
		employeePlans: getDayPlansByEmployeeQuery.data?.items ?? [],

		//  Queries
		getAllDayPlans,
		getAllDayPlansLoading: getAllDayPlansQuery.isLoading,

		getMyDailyPlans,
		getMyDailyPlansLoading: getMyDailyPlansQuery.isLoading,

		getEmployeeDayPlans,
		getDayPlansByEmployeeLoading: getDayPlansByEmployeeQuery.isLoading,

		getPlansByTask,
		getPlansByTaskLoading: getPlansByTaskQueryLoading,

		//  Mutations
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

		//  DERIVED VALUES (calculated locally with useMemo)
		futurePlans,
		pastPlans,
		outstandingPlans,
		todayPlan,
		sortedPlans,

		//  Loaders (for pre-caching in init-state.tsx)
		loadAllDayPlans,
		loadMyDailyPlans,
		loadEmployeeDayPlans,
		firstLoadDailyPlanData: handleFirstLoad
	};
}
