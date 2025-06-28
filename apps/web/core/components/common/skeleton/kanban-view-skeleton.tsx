import React from 'react';
import { KanbanColumnLoadingSkeleton } from './kanban-column-loading-skeleton';

interface KanbanViewSkeletonProps {
	className?: string;
	fullWidth?: boolean;
}

export function KanbanViewSkeleton({ className, fullWidth = true }: KanbanViewSkeletonProps) {
	const columns = Array.from(Array(5));
	const tasks = Array.from(Array(2));

	return (
		<div
			className={`w-[1280px] xl:w-[1500px] 2xl:w-[1600px] mt-6 relative bg-transparent dark:bg-[#181920] min-h-svh h-svh px-3 ${className || ''}`}
		>
			<div className="flex flex-row flex-1 gap-4 px-8 w-full h-full min-h-fit lg:px-0">
				{columns.map((_, index: number) => (
					<div key={index} className="flex flex-col gap-[10px] min-w-[325px]">
						{/* Column Header Skeleton */}
						<div className="h-10 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />

						{/* Tasks Skeleton */}
						<div className="flex flex-col gap-[5px]">
							{tasks.map((_, taskIndex: number) => (
								<KanbanColumnLoadingSkeleton className="relative" key={index} />
							))}

							{/* Add Task Button Skeleton */}
							<div className="h-14 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
