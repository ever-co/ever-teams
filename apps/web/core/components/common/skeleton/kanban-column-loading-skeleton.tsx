interface KanbanColumnLoadingSkeletonProps {
	className?: string;
}

export function KanbanColumnLoadingSkeleton({ className }: KanbanColumnLoadingSkeletonProps) {
	return (
		<div className={`bg-[#f2f2f2] dark:bg-[#191a20] absolute w-full ${className || ''}`}>
			{/* Loading state for column content */}
			<div className="h-[180px] bg-transparent bg-white dark:bg-[#1e2025] mt-3 flex flex-col justify-center items-center my-2 rounded-xl p-4 space-y-3">
				{/* Loading spinner animation */}
				<div className="w-8 h-8 border-2 border-[#F0F0F0] dark:border-[#353741] border-t-[#3B82F6] rounded-full animate-spin" />

				{/* Loading text */}
				<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Loading description */}
				<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Multiple task card skeletons */}
				<div className="w-full space-y-2 mt-4">
					<div className="w-full h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Create task button skeleton */}
			<div className="h-[52px] mt-4 w-full flex flex-row items-center text-sm not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4">
				<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
}
