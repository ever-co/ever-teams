import React, { FC } from 'react';

interface TeamStatsGridSkeletonProps {
	className?: string;
}

/**
 * Skeleton for TeamStatsGrid component
 * Matches the 5-column grid layout with stat cards
 */
export const TeamStatsGridSkeleton: FC<TeamStatsGridSkeletonProps> = ({ className }) => {
	return (
		<div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 ${className || ''}`}>
			{[...Array(5)].map((_, index) => (
				<div key={index} className="p-6 bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
					<div className="flex flex-col">
						{/* Stat Title */}
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
						
						{/* Stat Value */}
						<div className="mt-2 h-9">
							<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default TeamStatsGridSkeleton;
