// core/hooks/task-card/useTimerButton.ts
import { useCallback, useMemo, useState } from 'react';
import { useOrganizationEmployeeTeams, useStartStopTimerHandler, useTeamTasks, useTimerView } from '@/core/hooks';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import { toast } from 'sonner';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { useTranslations } from 'next-intl';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';

// Custom hook to extract TimerButtonCall business logic
export function useTimerButtonLogic({
	task,
	currentMember,
	activeTeam
}: {
	task: TTask;
	currentMember: TOrganizationTeamEmployee | undefined;
	activeTeam: TOrganizationTeam | null;
}) {
	const [loading, setLoading] = useState(false);
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { canTrack, disabled, startTimer, stopTimer, hasPlan } = useTimerView();
	const { setActiveTask } = useTeamTasks();
	const t = useTranslations();

	const activeTaskStatus = useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const startTimerWithTask = useCallback(async () => {
		if (task.status === 'closed') {
			toast.error('Task is closed');
			return;
		}

		if (timerStatus?.running) {
			setLoading(true);
			await stopTimer().finally(() => setLoading(false));
		}

		setActiveTask(task);

		// Update Current user's active task to sync across multiple devices
		const currentEmployeeDetails = activeTeam?.members?.find((member) => member.id === currentMember?.id);
		if (currentEmployeeDetails && currentEmployeeDetails.id) {
			updateOrganizationTeamEmployee(currentEmployeeDetails.id, {
				organizationId: task.organizationId,
				activeTaskId: task.id,
				organizationTeamId: activeTeam?.id,
				tenantId: activeTeam?.tenantId
			});
		}

		window.setTimeout(startTimer, 100);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, [
		task,
		timerStatus?.running,
		setActiveTask,
		activeTeam,
		startTimer,
		stopTimer,
		currentMember?.id,
		updateOrganizationTeamEmployee
	]);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler();

	return {
		loading,
		activeTaskStatus,
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
