import { clsxm } from '@/core/lib/utils';

interface CollaborateSkeletonProps {
	className?: string;
}

/** The Collaborate pill while its chunk loads: same height, width and shape as the button. */
export function CollaborateSkeleton({ className }: CollaborateSkeletonProps) {
	return (
		<div
			aria-hidden="true"
			className={clsxm('h-8 w-[120px] shrink-0 animate-pulse rounded-full bg-foreground/[0.05]', className)}
		/>
	);
}
