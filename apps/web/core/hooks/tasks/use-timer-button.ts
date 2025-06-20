// core/hooks/task-card/useTimerButton.ts
import { useCallback, useMemo, useState } from 'react';
import { useTimerView } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/task';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import { toast } from 'sonner';

export function useTimerButton({
	task,
	currentMember,
	activeTeam,
	setActiveTask,
	updateTeamEmployee
}: {
	task: ITask;
	currentMember: IEmployee;
	activeTeam: TOrganizationTeam;
	setActiveTask: (task: ITask) => void;
	updateTeamEmployee: (id: string, data: any) => void;
}) {
	const [loading, setLoading] = useState(false);
	const { timerStatus, activeTeamTask, startTimer, stopTimer, hasPlan } = useTimerView();

	const activeTaskStatus = useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

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
		const currentEmployee = activeTeam?.members?.find((m) => m.id === currentMember?.id);
		if (currentEmployee?.id) {
			updateTeamEmployee(currentEmployee.id, {
				organizationId: task.organizationId,
				activeTaskId: task.id,
				organizationTeamId: activeTeam?.id,
				tenantId: activeTeam?.tenantId
			});
		}

		setTimeout(startTimer, 100);
		window?.scrollTo({ top: 0, behavior: 'smooth' });
	}, [task, timerStatus?.running, setActiveTask, startTimer, stopTimer, currentMember, activeTeam]);

	return {
		loading,
		activeTaskStatus,
		startTimerWithTask,
		stopTimer,
		startTimer,
		hasPlan
	};
}
