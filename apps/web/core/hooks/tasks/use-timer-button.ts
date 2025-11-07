// core/hooks/task-card/useTimerButton.ts
import { useCallback, useMemo, useState } from 'react';
import { useStartStopTimerHandler, useTeamTasks, useTimerView } from '@/core/hooks';
import { useTimerOptimisticUI } from '@/core/hooks/activities/use-timer-optimistic-ui';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';

// Custom hook to extract TimerButtonCall business logic
export function useTimerButtonLogic({ task, activeTeam }: { task: TTask; activeTeam: TOrganizationTeam | null }) {
	const [loading, setLoading] = useState(false);
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { canTrack, disabled, startTimer, stopTimer, hasPlan } = useTimerView();
	const { setActiveTask } = useTeamTasks();
	const t = useTranslations();

	// Use optimistic UI hook for timer button feedback
	const { optimisticRunning, handleStop } = useTimerOptimisticUI({
		onStop: stopTimer
	});

	const activeTaskStatus = useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const startTimerWithTask = useCallback(async () => {
		if (task.status === 'closed') {
			toast.error(t('timer.TASK_CLOSED'));
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
				setLoading(false);
				toast.error(t('timer.TIMER_START_FAILED'));
				console.error('Failed to stop timer before starting new one:', error);
				return;
			} finally {
				setLoading(false);
			}
		}

		setActiveTask(task);

		// Show immediate feedback to user
		const toastId = toast.loading(t('timer.STARTING_TIMER'), {
			description: task.title || 'Task'
		});

		try {
			// Note: The old code called updateOrganizationTeamEmployee directly here, but this was removed because:
			// 1. startTimer() already calls updateOrganizationTeamEmployeeActiveTask internally
			// 2. Calling it twice caused race conditions and 403 errors
			// 3. The startTimer function properly handles all necessary updates
			// Therefore, we only call startTimer() to avoid duplicate API calls and race conditions

			// Start timer immediately - no artificial delay needed
			// The toast feedback is already shown above, so UI is responsive
			await startTimer();

			window.scrollTo({ top: 0, behavior: 'smooth' });
			toast.success(t('timer.TIMER_STARTED'), { id: toastId });
		} catch (error) {
			// Show error message
			toast.error(t('timer.TIMER_START_FAILED'), { id: toastId });
			console.error('Failed to start timer:', error);
		}
	}, [task, timerStatus?.running, setActiveTask, activeTeam, startTimer, handleStop, t]);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler();

	return {
		loading,
		activeTaskStatus,
		optimisticRunning,
		requirePlan,
		startTimerWithTask,
		modals,
		startStopTimerHandler,
		canTrack,
		disabled,
		hasPlan,
		activeTeamTask,
		startTimer,
		t
	};
}
