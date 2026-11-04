import { clsxm } from '@/core/lib/utils';

const BAR = 'animate-pulse bg-foreground/[0.06]';

/**
 * The timer while its chunk or its data loads, box for box with `Timer`: the digits line, the progress track under
 * it, the empty slot of the tracking-source icon and the 44px button. Give it the className the `Timer` receives, so
 * both resolve to the same width and padding.
 */
export const TimerSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			aria-hidden="true"
			className={clsxm('flex min-w-65 flex-row items-center justify-between gap-4 p-2', className)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<div className="flex min-w-0 items-start gap-2">
					<div className="flex min-w-0 flex-col">
						<div className="flex h-9 w-38 items-center">
							<span className={clsxm(BAR, 'h-7 w-full rounded-md')} />
						</div>
						<span className="mt-2 h-2 w-full rounded-full bg-foreground/10" />
					</div>
					<div />
				</div>
			</div>
			<div className="flex h-fit shrink-0 items-center justify-center">
				<span className={clsxm(BAR, 'size-11 rounded-full')} />
			</div>
		</div>
	);
};
