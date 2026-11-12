import { clsxm } from '@/core/lib/utils';

const BAR = 'animate-pulse bg-foreground/[0.06]';

const HOME_TIMER_PLACEHOLDERS = {
	toggle: 'size-11',
	clock: 'h-9 w-[6.75rem] sm:w-38',
	digits: 'h-6 sm:h-7',
	button: 'size-11'
};

const PROFILE_TIMER_PLACEHOLDERS = {
	toggle: 'size-7',
	clock: 'h-9 w-38',
	digits: 'h-7',
	button: 'size-11'
};

function placeholdersOf(compact: boolean) {
	if (compact) {
		return PROFILE_TIMER_PLACEHOLDERS;
	}
	return HOME_TIMER_PLACEHOLDERS;
}

/**
 * The timer while its chunk or its data loads, box for box with `Timer`: the notes and billable toggles, the digits
 * line, the progress track under it, the empty slot of the tracking-source icon and the button. Give it the className
 * and the `compact` the `Timer` receives, so both resolve to the same width and padding.
 */
export const TimerSkeleton = ({ className, compact = false }: { className?: string; compact?: boolean }) => {
	const placeholders = placeholdersOf(compact);

	return (
		<div
			aria-hidden="true"
			className={clsxm('flex min-w-65 flex-row items-center justify-between gap-4 p-2', className)}
		>
			<div className="flex min-w-0 items-center gap-2 lg:gap-4">
				<div className="flex shrink-0 items-center gap-2">
					<span className={clsxm(BAR, placeholders.toggle, 'rounded-full')} />
					<span className={clsxm(BAR, placeholders.toggle, 'rounded-full')} />
				</div>
				<div className="flex min-w-0 items-start gap-2">
					<div className="flex min-w-0 flex-col">
						<div className={clsxm('flex items-center', placeholders.clock)}>
							<span className={clsxm(BAR, placeholders.digits, 'w-full rounded-md')} />
						</div>
						<span className="mt-2 h-2 w-full rounded-full bg-foreground/10" />
					</div>
					<div />
				</div>
			</div>
			<div className="flex h-fit shrink-0 items-center justify-center">
				<span className={clsxm(BAR, placeholders.button, 'rounded-full')} />
			</div>
		</div>
	);
};
