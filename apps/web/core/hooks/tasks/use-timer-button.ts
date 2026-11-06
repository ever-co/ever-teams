// core/hooks/task-card/useTimerButton.ts
import { useCallback, useMemo, useState } from 'react';
import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-team-tasks-state';
import { useTimerActions } from '@/core/hooks/timer';
import type { TimerStartOutcome } from '@/core/hooks/timer/use-timer-api';
import { useTimerOptimisticUI } from '@/core/hooks/activities/use-timer-optimistic-ui';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamRequiresPlanState, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { canTrackTask } from '@/core/lib/helpers/timer-policy';

// Custom hook to extract TimerButtonCall business logic
export function useTimerButtonLogic({ task }: { task: TTask }) {
	const [loading, setLoading] = useState(false);
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	// PERF: this hook runs once PER TASK CARD. useTimerView() composes all three timer layers, and Layer 3
	// (useTimerUi) SUBSCRIBES to the ticking atoms (timeCounterState & co). Exactly one interval exists
	// app-wide — init-state.tsx owns it, because useTimerUi's effects are gated on a `firstLoad` that only
	// that instance ever flips — but every subscriber re-renders on its writes, i.e. 20x/second per card
	// while a timer runs, plus a wasted time-format computation each time. None of the five values below
	// come from Layer 3; they are all Layer 1 (useTimerApi). useTimerActions is the codebase's own
	// Layers-1+2 hook for exactly this case (its docblock: "No 50ms ticking interval").
	const { canTrack, canRunTimer, startTimer, stopTimer, hasPlan } = useTimerActions();
	const disabled = !canRunTimer;
	const { setActiveTask } = useSetActiveTask();
	const t = useTranslations();

	// Use optimistic UI hook for timer button feedback
	const { optimisticRunning, handleStop } = useTimerOptimisticUI({
		onStop: stopTimer
	});

	const activeTaskStatus = useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

	// The team's plan rule alone: this hook runs once per task card, which should not re-render on team refreshes
	const requirePlan = useAtomValue(activeTeamRequiresPlanState);
	const isPlanRequired = Boolean(requirePlan);
	const canTrackThisTask = canTrackTask(canTrack, isPlanRequired, hasPlan, task.id);

	const startTimerWithTask = useCallback(async () => {
		if (task.status === 'closed') {
			toast.warning(t('timer.TASK_CLOSED'), {
				id: 'timer-task-closed',
				description: t('toasts.timer.TASK_CLOSED_HINT')
			});
			return;
		}

		if (timerStatus?.running) {
			setLoading(true);
			try {
				// Use optimistic UI hook to handle stop with immediate feedback
				// If stop fails, this will throw and we won't continue to start
				await handleStop();
			} catch (error) {
				// Stop failed - don't continue to start a new timer
				// This prevents backend state inconsistency when stop fails
				// The stop mutation already showed why
				setLoading(false);
				console.error('Failed to stop timer before starting new one:', error);
				return;
			} finally {
				setLoading(false);
			}
		}

		// Await setActiveTask to prevent race condition with startTimer
		// Both setActiveTask and startTimer call updateOrganizationTeamEmployeeActiveTask
		// Without await, they run concurrently and cause 403 errors
		await setActiveTask(task);

		// Show immediate feedback to user
		const toastId = toast.loading(t('timer.STARTING_TIMER'), {
			description: task.title || undefined
		});

		try {
			// Note: The old code called updateOrganizationTeamEmployee directly here, but this was removed because:
			// 1. startTimer() already calls updateOrganizationTeamEmployeeActiveTask internally
			// 2. Calling it twice caused race conditions and 403 errors
			// 3. The startTimer function properly handles all necessary updates
			// Therefore, we only call startTimer() to avoid duplicate API calls and race conditions

			// NOTE_FIX: Pass task explicitly to startTimer to avoid race conditions
			// Between setActiveTask and startTimer, activeTeamTask might change due to useEffects or React Query refetches
			// Passing the task explicitly ensures startTimer uses the correct task
			const outcome: TimerStartOutcome = await startTimer(task);
			if (outcome !== 'started') {
				// startTimer already showed why nothing started
				toast.dismiss(toastId);
				return;
			}

			window.scrollTo({ top: 0, behavior: 'smooth' });
			toast.success(t('toasts.timer.STARTED'), { id: toastId });
		} catch (error) {
			// startTimer already shows the failure toast, so only the loading one is left to clear
			toast.dismiss(toastId);
			console.error('Failed to start timer:', error);
		}
	}, [task, timerStatus?.running, setActiveTask, startTimer, handleStop, t]);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler({ startTimer, stopTimer });

	return {
		loading,
		activeTaskStatus,
		optimisticRunning,
		requirePlan,
		startTimerWithTask,
		modals,
		startStopTimerHandler,
		canTrack: canTrackThisTask,
		disabled,
		hasPlan,
		activeTeamTask,
		startTimer,
		t
	};
}
