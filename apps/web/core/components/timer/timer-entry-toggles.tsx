'use client';

import { cn } from '@/core/lib/helpers';
import { TimerBillableToggle } from './timer-billable-toggle';
import { TimerNotesButton } from './timer-notes-button';

/** The entry's own properties, notes then billable, as one group set before the clock so the clock keeps its button. */
export function TimerEntryToggles({
	locked,
	className,
	toggleClassName
}: Readonly<{ locked: boolean; className?: string; toggleClassName?: string }>) {
	return (
		<div className={cn('flex shrink-0 items-center gap-1', className)}>
			<TimerNotesButton className={toggleClassName} />
			<TimerBillableToggle locked={locked} className={toggleClassName} />
		</div>
	);
}
