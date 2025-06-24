import React from 'react';

export const WorkingHoursSkeleton = () => {
	return (
		<div className="space-y-6 mt-6">
			{/* Timezone Section */}
			<div className="space-y-4">
				<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Working Days */}
			<div className="space-y-4">
				{Array.from({ length: 7 }).map((_, index) => (
					<div key={index} className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						{/* Day Toggle */}
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Time Slots (only for enabled days) */}
						{index < 5 && (
							<div className="flex items-center gap-4 pl-[180px]">
								<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-4 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						)}
					</div>
				))}
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};
