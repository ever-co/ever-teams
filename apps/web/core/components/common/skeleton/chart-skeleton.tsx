interface ChartSkeletonProps {
	className?: string;
}

export function ChartSkeleton({ className }: ChartSkeletonProps) {
	return (
		<div className={`flex flex-col p-4 w-full bg-white rounded-lg dark:bg-dark--theme-light ${className || ''}`}>
			{/* Chart controls skeleton */}
			<div className="flex gap-2 justify-end mb-2">
				<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
			
			{/* Chart area skeleton */}
			<div className="w-full h-[300px] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg mb-4 relative">
				{/* Y-axis labels */}
				<div className="absolute left-2 top-4 space-y-8">
					<div className="w-6 h-3 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
					<div className="w-6 h-3 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
					<div className="w-6 h-3 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
					<div className="w-6 h-3 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
				</div>
				
				{/* Chart lines simulation */}
				<div className="absolute inset-8 flex items-end justify-between">
					{Array.from({ length: 7 }).map((_, i) => (
						<div key={i} className="flex flex-col items-center space-y-2">
							{/* Data point */}
							<div className="w-2 h-2 bg-[#0284C7] rounded-full animate-pulse" />
							{/* X-axis label */}
							<div className="w-12 h-3 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
						</div>
					))}
				</div>
			</div>
			
			{/* Legend buttons skeleton */}
			<div className="flex gap-2 justify-center">
				<div className="w-20 h-6 bg-[#0284C7] animate-pulse rounded-full" />
				<div className="w-16 h-6 bg-[#DC2626] animate-pulse rounded-full" />
				<div className="w-12 h-6 bg-[#EAB308] animate-pulse rounded-full" />
				<div className="w-18 h-6 bg-[#22C55E] animate-pulse rounded-full" />
			</div>
		</div>
	);
}
