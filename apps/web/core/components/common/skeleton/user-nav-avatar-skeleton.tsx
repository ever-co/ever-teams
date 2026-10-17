import { clsxm } from '@/core/lib/utils';

interface UserNavAvatarSkeletonProps {
	className?: string;
	/** `sidebar`: the avatar · name · e-mail row at the foot of the sidebar. */
	variant?: 'header' | 'sidebar';
}

export function UserNavAvatarSkeleton({ className, variant = 'header' }: UserNavAvatarSkeletonProps) {
	if (variant === 'sidebar') {
		return (
			<div className={clsxm('flex items-center gap-2 p-2', className)}>
				<div className="size-8 shrink-0 animate-pulse rounded-full bg-black/5 dark:bg-white/8" />
				<div className="flex min-w-0 flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
					<div className="h-3 w-24 animate-pulse rounded-sm bg-black/5 dark:bg-white/8" />
					<div className="h-2.5 w-32 animate-pulse rounded-sm bg-black/5 dark:bg-white/8" />
				</div>
			</div>
		);
	}

	return (
		<div className={clsxm('relative', className)}>
			{/* Avatar skeleton with timer status */}
			<div className="relative">
				<div className="w-[3rem] h-[3rem] bg-[#F0F0F0] dark:bg-white/8 animate-pulse rounded-full border-[0.25rem] border-transparent dark:border-border" />
				
				{/* Timer status skeleton */}
				<div className="w-[1.3rem] h-[1.3rem] bg-[#F0F0F0] dark:bg-white/8 animate-pulse rounded-full absolute bottom-3 -right-2 -mb-4 border-[0.125rem] border-white dark:border-border" />
			</div>
		</div>
	);
}
