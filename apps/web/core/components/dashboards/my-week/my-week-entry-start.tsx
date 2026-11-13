'use client';

import { TaskCardTimerButton, TaskTimerController } from '@/core/components/tasks/task-card';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The task cards' own controller and button, so a start from an entry runs the same daily plan and tracking checks. */
export function MyWeekEntryStart({ task }: Readonly<{ task: TTask }>) {
	return (
		<TaskTimerController task={task}>
			<TaskCardTimerButton className="size-7" />
		</TaskTimerController>
	);
}
