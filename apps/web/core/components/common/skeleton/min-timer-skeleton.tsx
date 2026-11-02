import { clsxm } from '@/core/lib/utils';

/** The compact timer pill of the top bar while it loads: same height, width and shape as the timer. */
export function MinTimerSkeleton({ className }: Readonly<{ className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={clsxm('block h-8 w-[136px] shrink-0 animate-pulse rounded-full bg-foreground/[0.05]', className)}
		/>
	);
}
