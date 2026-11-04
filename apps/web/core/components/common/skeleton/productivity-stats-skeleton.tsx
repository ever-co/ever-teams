import React, { FC } from 'react';

interface ProductivityStatsSkeletonProps {
	className?: string;
}

/**
 * Skeleton for ProductivityStats component
 * Matches the three-column stats layout (Productive, Neutral, Unproductive)
 */
export const ProductivityStatsSkeleton: FC<ProductivityStatsSkeletonProps> = ({ className }) => {
	return (
		<div className={`flex gap-6 ${className || ''}`}>
			{/* Productive */}
			<div className="flex flex-col items-center gap-2">
				<div className="w-16 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-12 h-8 bg-foreground/5 animate-pulse rounded-md" />
			</div>

			{/* Neutral */}
			<div className="flex flex-col items-center gap-2">
				<div className="w-16 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-12 h-8 bg-foreground/5 animate-pulse rounded-md" />
			</div>

			{/* Unproductive */}
			<div className="flex flex-col items-center gap-2">
				<div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-12 h-8 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		</div>
	);
};

export default ProductivityStatsSkeleton;
