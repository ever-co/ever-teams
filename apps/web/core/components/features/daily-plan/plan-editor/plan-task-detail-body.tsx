'use client';

import { TaskDetailColumn } from '@/core/components/tasks/detail/task-detail-column';
import { TaskDetailHostProvider } from '@/core/components/tasks/detail/task-detail-host';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export function PlanTaskDetailBody({ task, isReady }: Readonly<{ task: TTask; isReady: boolean }>) {
	return (
		<TaskDetailHostProvider host="dialog">
			<TaskDetailColumn task={task} isReady={isReady} showsComposer={true} />
		</TaskDetailHostProvider>
	);
}
