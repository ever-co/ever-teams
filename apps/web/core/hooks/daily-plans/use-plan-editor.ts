'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DEFAULT_PLANNED_TASK_ID, TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { workDiaryPathOf } from '@/core/components/layouts/my-work-navigation';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { timesheetPathOf } from '@/core/lib/utils/dashboards/team';
import { diaryDayOfParam } from '@/core/lib/utils/dashboards/work-diary';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-team-tasks-state';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTimerActions } from '@/core/hooks/timer';
import type { TimerStartOutcome } from '@/core/hooks/timer/use-timer-api';
import { checkPastDate } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	automaticDefaultTask,
	isTodayPlan,
	otherPlanIdsByTask,
	planEstimateHours,
	planTrackedHours,
	planWarningKey,
	tasksMissingEstimateFirst
} from '@/core/lib/utils/daily-plan-editor';
import { activeTeamTaskState, tasksByTeamState, timerStatusState } from '@/core/stores';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export type PlanEditorScreen = 'plan' | 'search' | 'switchTask';

export type PlanPrimaryAction = 'start' | 'save' | 'edit' | 'workDiary' | 'timesheets';

export interface PlanEditorOptions {
	plan: TDailyPlan | undefined;
	tasks: TTask[];
	selectedDate: Date | undefined;
	employeeId: string | null | undefined;
	canEdit: boolean;
	isOpen: boolean;
	isRenderedInSoftFlow: boolean;
	closeModal: () => void;
}

const NO_OTHER_PLANS: string[] = [];

/** The timer's policy reads the day it last showed this dialog in the same UTC format. */
function seenTodayValue() {
	return new Date().toISOString().split('T')[0];
}

/** The copy the plans query refreshed after an edit, the passed one until it arrives. */
function freshPlanOf(plan: TDailyPlan | undefined, plans: TDailyPlan[] | undefined) {
	const planId = plan?.id;
	if (!planId) {
		return plan;
	}
	const fresh = plans?.find((candidate) => candidate.id === planId);
	return fresh ?? plan;
}

function primaryActionOf(
	isPast: boolean,
	isToday: boolean,
	isTimerRunning: boolean,
	isDraft: boolean,
	isOwnPlan: boolean
): PlanPrimaryAction {
	// A past day's time: one's own in the Work diary, a member's (a manager's view) in the team's timesheets
	if (isPast && isOwnPlan) {
		return 'workDiary';
	}
	if (isPast) {
		return 'timesheets';
	}
	if (!isToday) {
		return 'edit';
	}
	const savesWhileRunning = isTimerRunning && isDraft;
	if (savesWhileRunning) {
		return 'save';
	}
	return 'start';
}

/**
 * The plan of one day as the dialog edits it: the planned hours, the tasks and their estimates, the task the timer
 * starts on, and the way out (start working, save, or close). The rules are the previous dialog's: the hours are
 * saved only when they changed, starting needs tasks and hours, and the timer starts on the planned task.
 */
export function usePlanEditor(options: PlanEditorOptions) {
	const {
		plan: passedPlan,
		tasks: passedTasks,
		selectedDate,
		employeeId,
		canEdit,
		isOpen,
		isRenderedInSoftFlow,
		closeModal
	} = options;
	const t = useTranslations();
	const router = useRouter();
	const { data: currentUser } = useUserQuery();
	const { employeeDailyPlans, employeeFuturePlans, employeeTodayPlan } = useEmployeeDailyPlans(employeeId ?? null);
	const { updateDailyPlan } = useUpdateDailyPlan({ handlesOwnError: true });
	const teamTasks = useAtomValue(tasksByTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(timerStatusState);
	const { startTimer, stopTimer } = useTimerActions();
	const { setActiveTask } = useSetActiveTask();

	const [screen, setScreen] = useState<PlanEditorScreen>('plan');
	const [draftHours, setDraftHours] = useState<number | null>(null);
	const [lastSavedHours, setLastSavedHours] = useState<number | null>(null);
	const [chosenTaskId, setChosenTaskId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUnplanActiveOpen, setIsUnplanActiveOpen] = useState(false);
	const [seenOpenState, setSeenOpenState] = useState(isOpen);

	// The timer keeps this dialog mounted between openings: each opening starts from the saved plan.
	if (seenOpenState !== isOpen) {
		setSeenOpenState(isOpen);
		if (isOpen) {
			setScreen('plan');
			setDraftHours(null);
			setLastSavedHours(null);
			setChosenTaskId(null);
		}
	}

	const plan = useMemo(
		() => freshPlanOf(passedPlan, employeeDailyPlans.items),
		[passedPlan, employeeDailyPlans.items]
	);
	const tasks = plan?.tasks ?? passedTasks;
	const sortedTasks = useMemo(() => tasksMissingEstimateFirst(tasks), [tasks]);

	const savedHours = plan?.workTimePlanned ?? 0;
	const plannedHours = draftHours ?? savedHours;
	const differsFromPlan = draftHours !== null && draftHours !== savedHours;
	const isDraft = differsFromPlan && draftHours !== lastSavedHours;

	const estimateHours = useMemo(() => planEstimateHours(plan, teamTasks), [plan, teamTasks]);
	const trackedHours = useMemo(() => planTrackedHours(plan), [plan]);

	const hasPlan = Boolean(plan);
	const isPast = checkPastDate(plan?.date ?? selectedDate);
	const isToday = isTodayPlan(plan);
	const isTimerRunning = Boolean(timerStatus?.running);

	const warningKey = useMemo(() => {
		if (isPast) {
			return null;
		}
		return planWarningKey(plan?.tasks ?? [], plannedHours, estimateHours);
	}, [estimateHours, isPast, plan?.tasks, plannedHours]);

	const defaultTask = useMemo(() => {
		const chosen = sortedTasks.find((task) => task.id === chosenTaskId);
		return chosen ?? automaticDefaultTask(sortedTasks, activeTeamTask);
	}, [activeTeamTask, chosenTaskId, sortedTasks]);

	const defaultTaskId = defaultTask?.id;
	useEffect(() => {
		if (!isOpen || !defaultTaskId) {
			return;
		}
		window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, defaultTaskId);
	}, [defaultTaskId, isOpen]);

	const isActiveTaskPlanned = (plan?.tasks ?? []).some((task) => task.id === activeTeamTask?.id);
	const todayTasks = employeeTodayPlan[0]?.tasks ?? [];
	const isActiveTaskPlannedToday = todayTasks.some((task) => task.id === activeTeamTask?.id);

	const otherPlanIds = useMemo(
		() => otherPlanIdsByTask(tasks, [...employeeFuturePlans, ...employeeTodayPlan], plan?.id),
		[employeeFuturePlans, employeeTodayPlan, plan?.id, tasks]
	);
	const otherPlanIdsOf = useCallback((taskId: string) => otherPlanIds.get(taskId) ?? NO_OTHER_PLANS, [otherPlanIds]);

	const openUnplanActive = useCallback(() => setIsUnplanActiveOpen(true), []);

	const closeUnplanActive = useCallback(() => setIsUnplanActiveOpen(false), []);

	const setPlannedHours = useCallback(
		(hours: number) => {
			if (!canEdit) {
				return;
			}
			setDraftHours(hours);
		},
		[canEdit]
	);

	const chooseDefaultTask = useCallback(
		(task: TTask) => {
			if (!isToday) {
				return;
			}
			setChosenTaskId(task.id);
		},
		[isToday]
	);

	const closeAndRemember = useCallback(() => {
		if (isToday) {
			window.localStorage.setItem(TASKS_ESTIMATE_HOURS_MODAL_DATE, seenTodayValue());
		}
		closeModal();
	}, [closeModal, isToday]);

	const saveHoursIfChanged = useCallback(async () => {
		const planId = plan?.id;
		const hasChanged = plan?.workTimePlanned !== plannedHours;
		if (!planId || !hasChanged) {
			return;
		}
		// Gauzy checks the permission against the plan's owner, so the payload carries it.
		await updateDailyPlan({ workTimePlanned: plannedHours, employeeId: plan?.employeeId || undefined }, planId);
		setLastSavedHours(plannedHours);
		toast.success(t('dailyPlan.editor.toasts.PLAN_UPDATED'), {
			description: t('dailyPlan.editor.toasts.PLAN_UPDATED_DESCRIPTION', { count: plannedHours })
		});
	}, [plan?.employeeId, plan?.id, plan?.workTimePlanned, plannedHours, t, updateDailyPlan]);

	const startAndAnnounce = useCallback(() => {
		const started = startTimer();
		started
			?.then((outcome: TimerStartOutcome) => {
				if (outcome !== 'started') {
					return;
				}
				toast.success(t('dailyPlan.editor.toasts.WORK_STARTED'));
			})
			.catch(() => undefined);
	}, [startTimer, t]);

	const showSaveError = useCallback(
		(error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.plans.SAVE_FAILED'), { description: t(reasonKey) });
		},
		[t]
	);

	const closeAndSave = useCallback(async () => {
		setIsSubmitting(true);
		try {
			await saveHoursIfChanged();
			closeAndRemember();
		} catch (error) {
			console.error(error);
			showSaveError(error);
		} finally {
			setIsSubmitting(false);
		}
	}, [closeAndRemember, saveHoursIfChanged, showSaveError]);

	const startOnPlannedTask = useCallback(() => {
		const switchesTask = defaultTask?.id !== activeTeamTask?.id;
		if (switchesTask) {
			setActiveTask(defaultTask);
		}
		closeAndRemember();
		startAndAnnounce();
	}, [activeTeamTask?.id, closeAndRemember, defaultTask, setActiveTask, startAndAnnounce]);

	const submit = useCallback(async () => {
		setIsSubmitting(true);
		try {
			await saveHoursIfChanged();
			const startsWork = isToday && !isTimerRunning;
			if (!startsWork) {
				return;
			}
			if (!isActiveTaskPlanned) {
				setScreen('switchTask');
				return;
			}
			startOnPlannedTask();
		} catch (error) {
			console.error(error);
			showSaveError(error);
		} finally {
			setIsSubmitting(false);
		}
	}, [isActiveTaskPlanned, isTimerRunning, isToday, saveHoursIfChanged, showSaveError, startOnPlannedTask]);

	/** The "change active task" step ends like a start: the dialog closes and the timer runs. */
	const finishTaskSwitch = useCallback(() => {
		closeAndRemember();
		startAndAnnounce();
	}, [closeAndRemember, startAndAnnounce]);

	// A plan that names no one is the signed-in person's own
	const planUserId = plan?.employee?.user?.id;
	const isOwnPlan = !planUserId || planUserId === currentUser?.id;

	/**
	 * A past plan's time: the signed-in person's own plan opens their Work diary on the plan's day; a member's plan,
	 * which a manager sees, opens the team's timesheets, where a manager reviews a member's time.
	 */
	const openPastPlanTime = useCallback(() => {
		closeModal();
		if (isOwnPlan) {
			const planDayKey = plan?.date ? getDailyPlanDay(plan.date) : null;
			const planDay = planDayKey ? diaryDayOfParam(planDayKey, new Date()) : (selectedDate ?? new Date());
			router.push(workDiaryPathOf(planDay));
			return;
		}
		const planUserName = plan?.employee?.fullName || plan?.employee?.user?.name || '';
		router.push(timesheetPathOf(planUserId ?? '', planUserName));
	}, [closeModal, isOwnPlan, plan?.date, plan?.employee, planUserId, router, selectedDate]);

	const primaryAction = primaryActionOf(isPast, isToday, isTimerRunning, isDraft, isOwnPlan);
	const hasNoTask = (plan?.tasks ?? []).length === 0;
	const hasNoHours = plannedHours <= 0;
	const lacksStartRequirements = hasNoTask || hasNoHours;
	const waitsForAnEdit = isTimerRunning && !isDraft;

	let isPrimaryDisabled = isSubmitting;
	if (primaryAction === 'start') {
		isPrimaryDisabled = isSubmitting || lacksStartRequirements || waitsForAnEdit;
	}
	const showsTimerRunningHint = isToday && waitsForAnEdit;

	let runPrimary: () => void = () => void submit();
	const opensPastPlanTime = primaryAction === 'workDiary' || primaryAction === 'timesheets';
	if (opensPastPlanTime) {
		runPrimary = openPastPlanTime;
	}

	let runSecondary: () => void = closeAndRemember;
	if (isRenderedInSoftFlow) {
		runSecondary = () => void closeAndSave();
	}

	return {
		plan,
		hasPlan,
		sortedTasks,
		screen,
		setScreen,
		isPast,
		isToday,
		plannedHours,
		setPlannedHours,
		estimateHours,
		trackedHours,
		warningKey,
		defaultTask,
		chooseDefaultTask,
		isActiveTaskPlannedToday,
		otherPlanIdsOf,
		isSubmitting,
		primaryAction,
		isPrimaryDisabled,
		showsTimerRunningHint,
		runPrimary,
		runSecondary,
		closeAndSave,
		finishTaskSwitch,
		isUnplanActiveOpen,
		openUnplanActive,
		closeUnplanActive,
		activeTeamTask,
		stopTimer
	};
}

export type PlanEditorState = ReturnType<typeof usePlanEditor>;
