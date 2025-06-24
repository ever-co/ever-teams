interface KanbanFiltersSkeletonProps {
	className?: string;
}

export function KanbanFiltersSkeleton({ className }: KanbanFiltersSkeletonProps) {
	return (
		<div className={`flex gap-5 mt-4 lg:mt-0 min-h-8 max-h-10 ${className || ''}`}>
			{/* Epic Properties Dropdown Skeleton */}
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Status Dropdown Skeleton */}
			<div className="relative z-10 flex items-center justify-center min-w-28 max-w-fit lg:mt-0 input-border flex-col bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-4 max-h-full rounded-[8px]">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Task Labels Dropdown Skeleton */}
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Task Properties Dropdown Skeleton */}
			<div className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-2" />
			</div>

			{/* Task Sizes Dropdown Skeleton */}
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Separator */}
			<div className="inline-block mt-1 shrink-0 min-h-10 h-full w-0.5 bg-[#F0F0F0] dark:bg-[#353741]" />

			{/* Search Skeleton */}
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
}
