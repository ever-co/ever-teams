'use client';

import { cn } from '@/core/lib/helpers';
import { TimerBillableToggle } from './timer-billable-toggle';
import { TimerNotesButton } from './timer-notes-button';
import { TimerLabelsControl } from './timer-labels-control';

/**
 * The entry's own properties, notes, labels then billable, as one group set before the clock so the clock keeps its
 * button.
 * `billableClassName` lets a timer give the Billable toggle's room to another control (the break button on a phone),
 * and `labelsClassName` lets it leave Labels to another row (the home timer's phone row, beside Discard).
 */
export function TimerEntryToggles({
	locked,
	className,
	toggleClassName,
	billableClassName,
	labelsClassName
}: Readonly<{
	locked: boolean;
	className?: string;
	toggleClassName?: string;
	billableClassName?: string;
	labelsClassName?: string;
}>) {
	return (
		<div className={cn('flex shrink-0 items-center gap-1', className)}>
			<TimerNotesButton className={toggleClassName} />
			<TimerLabelsControl className={cn(toggleClassName, labelsClassName)} />
			<TimerBillableToggle locked={locked} className={cn(toggleClassName, billableClassName)} />
		</div>
	);
}
