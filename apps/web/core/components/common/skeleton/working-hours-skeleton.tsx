import React from 'react';

export const WorkingHoursSkeleton = () => {
	return (
		<div className="space-y-6 mt-6">
			{/* Timezone Section */}
			<div className="space-y-4">
				<div className="w-32 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-64 h-9 bg-foreground/5 animate-pulse rounded-md" />
			</div>

			{/* Working Days */}
			<div className="space-y-4">
				{Array.from({ length: 7 }).map((_, index) => (
					<div key={index} className="relative hairline-t border-border py-3">
						{/* Day Toggle */}
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-10.5 h-6 bg-foreground/5 animate-pulse rounded-full" />
								<div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-md" />
							</div>
							<div className="size-7 bg-foreground/5 animate-pulse rounded-md" />
						</div>

						{/* Time Slots (only for enabled days) */}
						{index < 5 && (
							<div className="flex items-center gap-4 pl-[180px]">
								<div className="w-24 h-9 bg-foreground/5 animate-pulse rounded-md" />
								<div className="w-4 h-1 bg-foreground/5 animate-pulse rounded-sm" />
								<div className="w-24 h-9 bg-foreground/5 animate-pulse rounded-md" />
							</div>
						)}
					</div>
				))}
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<div className="w-24 h-9 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		</div>
	);
};
