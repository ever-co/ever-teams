import { FC } from 'react';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface ProductivityHeaderSkeletonProps {
	className?: string;
}

/** The month header of the productivity surface: the period line, then its one-sentence description. */
export const ProductivityHeaderSkeleton: FC<ProductivityHeaderSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col', className)}>
			<div className="flex h-7 items-center">
				<div className={cn(BAR, 'h-5 w-40')} />
			</div>
			<div className="flex h-5 items-center">
				<div className={cn(BAR, 'h-3 w-64')} />
			</div>
		</div>
	);
};

export default ProductivityHeaderSkeleton;
