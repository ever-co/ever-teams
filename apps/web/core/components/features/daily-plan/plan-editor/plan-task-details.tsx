'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { APP_DIALOG_BODY, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { TaskDetailColumnSkeleton } from '@/core/components/tasks/detail/task-detail-skeleton';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { cn } from '@/core/lib/helpers';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const LazyPlanTaskDetail = dynamic(() => import('./plan-task-detail-body').then((mod) => mod.PlanTaskDetailBody), {
	ssr: false,
	loading: () => <TaskDetailColumnSkeleton />
});

/** A child of the plan dialog, so focus and Escape stay with the top layer and closing it returns to the plan. */
export function PlanTaskDetailsDialog({ task, onClose }: Readonly<{ task: TTask; onClose: () => void }>) {
	const t = useTranslations();
	const { detail, isReady } = useDetailedTask(task, true);
	let shownTask = task;
	if (detail) {
		shownTask = detail;
	}
	return (
		<AppDialog open={true} onClose={onClose} width="lg" className="sm:h-[85dvh] sm:max-w-[min(54rem,92vw)]">
			<AppDialogHeader
				title={t('taskDrawer.TASK_DETAILS')}
				context={<span className="tabular-nums">#{task.taskNumber}</span>}
				onClose={onClose}
			/>
			<div className={cn(APP_DIALOG_BODY, 'px-0')}>
				<LazyPlanTaskDetail task={shownTask} isReady={isReady} />
			</div>
		</AppDialog>
	);
}
