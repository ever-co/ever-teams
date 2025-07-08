interface KanbanCardSkeletonProps {
	className?: string;
}

export function KanbanCardSkeleton({ className }: KanbanCardSkeletonProps) {
	return (
		<div className={`flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative ${className || ''}`}>
			{/* Header section with status and menu */}
			<div className="w-full justify-between h-fit">
				<div className="w-full flex justify-between">
					{/* Task status skeleton */}
					<div className="w-64">
						<div className="flex items-center gap-2">
							<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
					{/* Menu skeleton */}
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				
				{/* Task title and input section */}
				<div className="w-full flex justify-between my-3">
					<div className="flex items-center w-64">
						<div className="w-56">
							<div className="w-full h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
					{/* Priority icon skeleton */}
					<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Task description skeleton */}
			<div className="w-full mb-3">
				<div className="w-3/4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
				<div className="w-1/2 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Task properties section */}
			<div className="flex items-center justify-between w-full">
				{/* Labels skeleton */}
				<div className="flex gap-1">
					<div className="w-12 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					<div className="w-16 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				</div>
				
				{/* Time and progress skeleton */}
				<div className="flex items-center gap-2">
					<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				</div>
			</div>

			{/* Assignees section */}
			<div className="flex items-center justify-between mt-3">
				{/* Assignee avatars skeleton */}
				<div className="flex -space-x-2">
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-2 border-white" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-2 border-white" />
				</div>
				
				{/* Task number skeleton */}
				<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
}
