import { clsxm } from '@/core/lib/utils';

interface UserNavAvatarSkeletonProps {
	className?: string;
	/** `sidebar`: the avatar · name · e-mail row at the foot of the sidebar. */
	variant?: 'header' | 'sidebar';
}

export function UserNavAvatarSkeleton({ className, variant = 'header' }: Readonly<UserNavAvatarSkeletonProps>) {
	if (variant === 'sidebar') {
		return (
			<div className={clsxm('flex items-center gap-2.5 p-1.5', className)}>
				<div className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
				<div className="flex min-w-0 flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
					<div className="flex items-center gap-1.5">
						<div className="h-3 w-24 animate-pulse rounded-full bg-foreground/[0.06]" />
						<div className="h-3.5 w-12 animate-pulse rounded-[5px] bg-foreground/[0.06]" />
					</div>
					<div className="h-2.5 w-32 animate-pulse rounded-full bg-foreground/[0.06]" />
				</div>
				<div className="size-4 shrink-0 animate-pulse rounded-sm bg-foreground/[0.06] group-data-[collapsible=icon]:hidden" />
			</div>
		);
	}

	return (
		<div className={clsxm('relative', className)}>
			{/* Avatar skeleton with timer status */}
			<div className="relative">
				<div className="w-[3rem] h-[3rem] bg-foreground/5 animate-pulse rounded-full border-[0.25rem] border-transparent dark:border-border" />

				{/* Timer status skeleton */}
				<div className="w-[1.3rem] h-[1.3rem] bg-foreground/5 animate-pulse rounded-full absolute bottom-3 -right-2 -mb-4 border-2 border-card" />
			</div>
		</div>
	);
}
