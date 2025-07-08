import React, { FC } from 'react';

interface ProductivityHeaderSkeletonProps {
	className?: string;
}

/**
 * Skeleton for ProductivityHeader component
 * Matches the month/year header structure
 */
export const ProductivityHeaderSkeleton: FC<ProductivityHeaderSkeletonProps> = ({ className }) => {
	return (
		<div className={`flex flex-col gap-2 ${className || ''}`}>
			{/* Month */}
			<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			{/* Year */}
			<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
		</div>
	);
};

export default ProductivityHeaderSkeleton;
