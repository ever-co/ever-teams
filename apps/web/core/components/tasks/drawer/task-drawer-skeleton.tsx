import { TaskDetailColumnSkeleton } from '@/core/components/tasks/detail/task-detail-skeleton';

export function TaskDrawerSkeleton() {
	return (
		<>
			<div className="h-12 shrink-0 hairline-b border-border" />
			<div className="min-h-0 flex-1 overflow-hidden">
				<TaskDetailColumnSkeleton />
			</div>
		</>
	);
}
