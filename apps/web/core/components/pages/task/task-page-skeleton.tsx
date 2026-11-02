'use client';

import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { TaskDetailBandSkeleton, TaskDetailPageSkeleton } from '@/core/components/tasks/detail/task-detail-skeleton';

export function TaskPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<TaskDetailBandSkeleton />} className="min-h-0 flex-1 p-0">
			<TaskDetailPageSkeleton />
		</PageSkeletonFrame>
	);
}
