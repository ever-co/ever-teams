'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { TimerPlanDialogs } from '@/core/components/features/daily-plan/timer-plan-dialogs';
import { useRunOnce } from '@/core/hooks/common/use-run-once';
import { useTimerButtonLogic } from '@/core/hooks/tasks/use-timer-button';
import { ALREADY_TRACKING_TOAST_ID } from '@/core/hooks/timer/use-timer-api';
import { useTimerStartNotes } from '@/core/hooks/timer/use-timer-start-notes';
import type { TimerTaskStartRequest } from '@/core/hooks/timer/use-timer-task-start';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { timerTaskStartActionOf } from '@/core/lib/utils/timer/timer-task-start';
import { timerBillableChoicesState, timerStatusState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import type { TTimerStartNotes } from '@/core/stores/timer/timer-start-notes';
import { ETaskStatusName } from '@/core/types/generics/enums/task';

type TimerPlanModals = ReturnType<typeof useTimerButtonLogic>['modals'];

function isPlanDialogOpenOf(modals: TimerPlanModals) {
	const { isEnforceTaskModalOpen, isTasksEstimationHoursModalOpen, isSuggestDailyPlanModalOpen } = modals;
	return Boolean(isEnforceTaskModalOpen || isTasksEstimationHoursModalOpen || isSuggestDailyPlanModalOpen);
}

/**
 * Runs the timer start it is mounted for, once, through the hooks of the task's own Start button: the same stop of
 * a running timer, the same daily plan rule and dialogs, the same tracking checks. A continued entry first hands
 * its billable status to the timer's billable choice and its notes to the start.
 */
function TimerTaskStart({ request }: Readonly<{ request: TimerTaskStartRequest }>) {
	const t = useTranslations();
	const { task, carry } = request;
	const { activeTaskStatus, disabled, canTrack, startStopTimerHandler, startTimerWithTask, modals } =
		useTimerButtonLogic({ task });
	const timerStatus = useAtomValue(timerStatusState);
	// The status the timers show, filtered to the active team: a run it leaves out reads as stopped there
	const shownTimerStatus = useAtomValue(teamTimerStatusState);
	const setBillableChoices = useSetAtom(timerBillableChoicesState);
	const { handNotes, dropHandedNotes } = useTimerStartNotes();
	// The notes handed to the main Start, which may wait for its daily plan dialogs
	const [mainStartNotes, setMainStartNotes] = useState<TTimerStartNotes | null>(null);
	const isPlanDialogOpen = isPlanDialogOpenOf(modals);

	// The main Start started at once, taking the notes as it was asked, or opened the daily plan dialogs, whose own
	// start takes them however long the member took. Once no dialog is open, notes still waiting were given up with the
	// dialogs, and so are they when this start goes with a dialog open: they never ride on a later start of the task.
	useEffect(() => {
		if (!isPlanDialogOpen) {
			dropHandedNotes(mainStartNotes);
			return undefined;
		}
		return () => dropHandedNotes(mainStartNotes);
	}, [dropHandedNotes, isPlanDialogOpen, mainStartNotes]);

	/** Hands the continued entry's billable status and notes to the timer; answers the notes handed. */
	const handCarryToTimer = () => {
		if (!carry) {
			return null;
		}
		setBillableChoices((current) => ({ ...current, [task.id]: carry.isBillable }));
		return handNotes(task.id, carry.description);
	};

	useRunOnce(() => {
		const isTimerRunning = timerStatus?.running === true;
		const runningTaskId = timerStatus?.lastLog?.taskId;
		const action = timerTaskStartActionOf({
			isTaskClosed: task.status === ETaskStatusName.CLOSED,
			isActiveTask: Boolean(activeTaskStatus),
			isTimerRunning,
			isRunningOnTask: isTimerRunning && runningTaskId === task.id,
			hasHiddenRun: isTimerRunning && shownTimerStatus?.running !== true,
			isMainStartDisabled: disabled,
			canTrackTask: canTrack
		});

		switch (action) {
			case 'TASK_CLOSED':
				toast.warning(t('timer.TASK_CLOSED'), {
					id: 'timer-task-closed',
					description: t('toasts.timer.TASK_CLOSED_HINT')
				});
				return;
			case 'ALREADY_RUNNING':
				toast.info(t('timeEntryActions.ALREADY_RUNNING'), { id: 'timer-already-running-on-task' });
				return;
			case 'HIDDEN_RUN':
				// The card's start would stop it first, ending time tracked elsewhere that the member cannot see
				toast.warning(t('timer.ALREADY_TRACKING_MESSAGE'), { id: ALREADY_TRACKING_TOAST_ID });
				return;
			case 'UNAVAILABLE':
				toast.warning(t('timer.START_TIMER'), { id: 'timer-start-unavailable' });
				return;
			case 'BLOCKED_BY_PLAN':
				toast.warning(t('timer.PLAN_REQUIRED_TO_START'), { id: 'timer-plan-required' });
				return;
			case 'MAIN_START': {
				const handed = handCarryToTimer();
				startStopTimerHandler();
				setMainStartNotes(handed);
				return;
			}
			case 'TASK_START': {
				const handed = handCarryToTimer();
				// The start reports its own failures; this only keeps a rejection from going unhandled
				startTimerWithTask()
					.catch((error) => logErrorInDev('[Timer] Start on a task failed:', error))
					.finally(() => dropHandedNotes(handed));
				return;
			}
		}
	});

	return <TimerPlanDialogs modals={modals} />;
}

/**
 * Mounted beside the surface that asks for the start, never inside a menu or a popover that closes: the start may
 * open the daily plan dialogs after it closed.
 */
export function TimerTaskStartLayer({ request }: Readonly<{ request: TimerTaskStartRequest | null }>) {
	if (!request) {
		return null;
	}
	return <TimerTaskStart key={request.id} request={request} />;
}
