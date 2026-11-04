import { clsxm } from '@/core/lib/utils';

/** The outstanding plans notice while its chunk loads: the `Notice` card with its mark, two lines and an action. */
const TeamNotificationsSkeleton = ({ className }: { className?: string }) => {
	return (
		<div aria-hidden="true" className={clsxm('mb-1 flex flex-col gap-2', className)}>
			<div className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 hairline-ring ring-border shadow-sm shadow-black/6.5">
				<span className="size-[18px] shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<span className="h-2.5 w-64 max-w-full animate-pulse rounded-full bg-foreground/[0.07]" />
					<span className="h-2 w-40 max-w-full animate-pulse rounded-full bg-foreground/[0.05]" />
				</div>
				<span className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-foreground/[0.05]" />
			</div>
		</div>
	);
};

export default TeamNotificationsSkeleton;
