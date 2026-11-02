'use client';

import { createElement, useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import moment from 'moment';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useCreateTask } from '@/core/hooks/organizations/teams/use-create-task';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { isTodayPlan } from '@/core/lib/utils/daily-plan-editor';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { activeTeamTaskState, timerStatusState } from '@/core/stores';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { toastMoment } from '@/core/components/common/toast-moment';
import { Calendar } from '@/core/components/icons';

/** The previous dialog's rule: a shorter title creates a task nobody can recognise later. */
export const PLAN_TASK_TITLE_MIN_LENGTH = 5;

interface PlanTaskActionsOptions {
	plan: TDailyPlan | undefined;
	selectedDate: Date | undefined;
	employeeId: string | null | undefined;
	canEdit: boolean;
	isActiveTaskPlannedToday: boolean;
	otherPlanIdsOf: (taskId: string) => string[];
	/** The running timer's task cannot leave today's plan silently: the confirmation stops the timer first. */
	onActiveTaskBlocked: () => void;
}

/**
 * What the plan rows and the task search do: add a task (creating the day's plan when there is none), remove it
 * from this plan or from every upcoming plan, create a task, open a task. A manager acting on someone else's plan
 * acts as the plan's owner, as the previous dialog did.
 */
export function usePlanTaskActions(options: PlanTaskActionsOptions) {
	const { plan, selectedDate, employeeId, canEdit, isActiveTaskPlannedToday, otherPlanIdsOf, onActiveTaskBlocked } =
		options;
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const { addTaskToPlan, removeTaskFromPlan, removeManyTaskPlans } = useUpdateDailyPlan({ handlesOwnError: true });
	const { createDailyPlan } = useCreateDailyPlan();
	const { createTask } = useCreateTask();
	const { taskStatuses } = useTaskStatusesQuery();
	const { getTaskById } = useTaskQueries();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(timerStatusState);
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
	const [queuedTasks, setQueuedTasks] = useState<TTask[]>([]);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [viewedTask, setViewedTask] = useState<TTask | null>(null);

	const organizationId = user?.employee?.organizationId;
	const actingEmployeeId = employeeId ?? user?.employee?.id;
	const isTimerRunning = Boolean(timerStatus?.running);

	const showFailure = useCallback(
		(titleKey: DottedLanguageObjectStringPaths, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(titleKey), { description: t(reasonKey) });
		},
		[t]
	);

	const runsActiveTask = useCallback(
		(taskId: string, isInTodayScope: boolean) => {
			const isActiveTask = taskId === activeTeamTask?.id;
			const isLocked = isActiveTask && isTimerRunning;
			return isLocked && isInTodayScope;
		},
		[activeTeamTask?.id, isTimerRunning]
	);

	const addToExistingPlan = useCallback(
		async (task: TTask, existingPlan: TDailyPlan, planId: string) => {
			// Gauzy looks the plan up with the owner's employee id: a manager's own id would not find it.
			if (!existingPlan.employeeId) {
				throw new Error('Cannot add task to plan without employeeId');
			}
			await addTaskToPlan({ taskId: task.id, employeeId: existingPlan.employeeId, organizationId }, planId);
		},
		[addTaskToPlan, organizationId]
	);

	const createPlanWithTask = useCallback(
		async (task: TTask) => {
			const planDate = plan?.date ?? selectedDate;
			if (!planDate || !actingEmployeeId) {
				return false;
			}
			await createDailyPlan({
				workTimePlanned: 0,
				taskId: task.id,
				date: moment(planDate).format('YYYY-MM-DD'),
				status: EDailyPlanStatus.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: actingEmployeeId,
				organizationId: organizationId as string
			});
			toastMoment(t('dailyPlan.editor.toasts.PLAN_CREATED'), createElement(Calendar), {
				description: t('dailyPlan.editor.toasts.PLAN_CREATED_DESCRIPTION', { title: task.title })
			});
			return true;
		},
		[actingEmployeeId, createDailyPlan, organizationId, plan?.date, selectedDate, t, user?.tenantId]
	);

	/** Resolves to true once the task is in the plan, so the search can close. */
	const addTask = useCallback(
		async (task: TTask) => {
			if (!canEdit) {
				return false;
			}
			setPendingTaskId(task.id);
			const planId = plan?.id;
			const hasExistingPlan = Boolean(plan) && Boolean(planId);
			try {
				if (plan && planId) {
					await addToExistingPlan(task, plan, planId);
					return true;
				}
				return await createPlanWithTask(task);
			} catch (error) {
				console.error(error);
				// A failed plan creation is reported by useCreateDailyPlan
				if (hasExistingPlan) {
					showFailure('toasts.plans.ADD_FAILED', error);
				}
				return false;
			} finally {
				setPendingTaskId(null);
			}
		},
		[addToExistingPlan, canEdit, createPlanWithTask, plan, showFailure]
	);

	/**
	 * Picked tasks join one after the other: Gauzy adds one task per request, and the first one may still be creating
	 * the day's plan. The ones still waiting show as queued until their own request starts.
	 */
	const addTasks = useCallback(
		async (tasks: TTask[]) => {
			setQueuedTasks(tasks);
			let addedCount = 0;
			for (const task of tasks) {
				setQueuedTasks((current) => current.filter((queued) => queued.id !== task.id));
				const isAdded = await addTask(task);
				if (isAdded) {
					addedCount += 1;
				}
			}
			return addedCount;
		},
		[addTask]
	);

	const removeFromPlan = useCallback(
		async (task: TTask) => {
			const planId = plan?.id;
			if (!canEdit || !planId) {
				return;
			}
			if (runsActiveTask(task.id, isTodayPlan(plan))) {
				onActiveTaskBlocked();
				return;
			}
			setPendingTaskId(task.id);
			try {
				await removeTaskFromPlan({ taskId: task.id, employeeId: actingEmployeeId, organizationId }, planId);
			} catch (error) {
				console.error(error);
				showFailure('toasts.plans.REMOVE_FAILED', error);
			} finally {
				setPendingTaskId(null);
			}
		},
		[
			actingEmployeeId,
			canEdit,
			onActiveTaskBlocked,
			organizationId,
			plan,
			removeTaskFromPlan,
			runsActiveTask,
			showFailure
		]
	);

	const removeFromAllPlans = useCallback(
		async (task: TTask) => {
			const planId = plan?.id;
			if (!canEdit || !planId) {
				return;
			}
			if (runsActiveTask(task.id, isActiveTaskPlannedToday)) {
				onActiveTaskBlocked();
				return;
			}
			setPendingTaskId(task.id);
			try {
				const plansIds = [planId, ...otherPlanIdsOf(task.id)];
				await removeManyTaskPlans({ plansIds, employeeId: actingEmployeeId, organizationId }, task.id);
				toast.success(t('dailyPlan.editor.toasts.TASK_REMOVED_EVERYWHERE'));
			} catch (error) {
				console.error(error);
				showFailure('toasts.plans.REMOVE_FAILED', error);
			} finally {
				setPendingTaskId(null);
			}
		},
		[
			actingEmployeeId,
			canEdit,
			isActiveTaskPlannedToday,
			onActiveTaskBlocked,
			organizationId,
			otherPlanIdsOf,
			plan?.id,
			removeManyTaskPlans,
			runsActiveTask,
			showFailure,
			t
		]
	);

	/** New tasks start in the team's first status, as a bug, the previous dialog's defaults. */
	const createTeamTask = useCallback(
		async (rawTitle: string) => {
			const title = rawTitle.trim();
			const isTooShort = title.length < PLAN_TASK_TITLE_MIN_LENGTH;
			if (isTooShort) {
				return;
			}
			setIsCreatingTask(true);
			try {
				const firstStatus = taskStatuses[0];
				await createTask({
					title,
					status: firstStatus?.name ?? undefined,
					taskStatusId: firstStatus?.id,
					issueType: EIssueType.BUG
				});
				toast.success(t('dailyPlan.editor.toasts.TASK_CREATED'), {
					description: t('dailyPlan.editor.toasts.TASK_CREATED_DESCRIPTION', { title })
				});
			} catch (error) {
				// useCreateTask already told the user
				console.error(error);
			} finally {
				setIsCreatingTask(false);
			}
		},
		[createTask, t, taskStatuses]
	);

	const viewTask = useCallback(
		(task: TTask) => {
			getTaskById(task.id);
			setViewedTask(task);
		},
		[getTaskById]
	);

	const closeViewedTask = useCallback(() => setViewedTask(null), []);

	return {
		pendingTaskId,
		isCreatingTask,
		viewedTask,
		addTask,
		addTasks,
		queuedTasks,
		removeFromPlan,
		removeFromAllPlans,
		createTeamTask,
		viewTask,
		closeViewedTask
	};
}
