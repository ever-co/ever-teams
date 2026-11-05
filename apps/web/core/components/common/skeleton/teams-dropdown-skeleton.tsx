import { clsxm } from '@/core/lib/utils';

interface TeamsDropDownSkeletonProps {
	className?: string;
}

/** The team switcher pill while its chunk loads: the team tile, the name and the count, at the trigger's size. */
export function TeamsDropDownSkeleton({ className }: TeamsDropDownSkeletonProps) {
	return (
		<div
			aria-hidden="true"
			className={clsxm(
				'inline-flex h-8 w-[160px] shrink-0 items-center gap-2 rounded-full bg-card pl-1.5 pr-2.5 hairline-ring ring-border',
				className
			)}
		>
			<span className="size-5 shrink-0 animate-pulse rounded-[28%] bg-foreground/[0.06]" />
			<span className="h-2.5 flex-1 animate-pulse rounded-full bg-foreground/[0.06]" />
			<span className="h-4 w-5 shrink-0 animate-pulse rounded-[5px] bg-foreground/[0.05]" />
		</div>
	);
}
