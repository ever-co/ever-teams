import { clsxm } from '@/core/lib/utils';

interface NoTeamSkeletonProps {
	className?: string;
}

export function NoTeamSkeleton({ className }: Readonly<NoTeamSkeletonProps>) {
	return (
		<div className={clsxm('flex flex-col items-center justify-center min-h-[400px] p-8', className, 'w-full')}>
			{/* Icon skeleton */}
			<div className="size-[70px] bg-foreground/5 animate-pulse rounded-full mb-5" />

			{/* Title skeleton */}
			<div className="w-64 h-8 bg-foreground/5 animate-pulse rounded-md mb-4" />

			{/* Description skeleton */}
			<div className="w-96 h-4 bg-foreground/5 animate-pulse rounded-md mb-2" />
			<div className="w-80 h-4 bg-foreground/5 animate-pulse rounded-md mb-5" />

			{/* Button skeleton */}
			<div className="w-40 h-9 bg-foreground/5 animate-pulse rounded-md" />
		</div>
	);
}
