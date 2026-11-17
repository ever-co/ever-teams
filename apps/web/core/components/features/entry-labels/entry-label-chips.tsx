'use client';

import { cn } from '@/core/lib/helpers';
import type { EntryLabel } from '@/core/lib/utils/time-log-labels';

const FALLBACK_COLOR = '#9ca3af';

/**
 * The labels of a time entry as chips, each with its color, as task labels show (Gauzy #12029). An entry without
 * labels shows nothing. Past `max` chips, the rest is counted.
 */
export function EntryLabelChips({
	labels,
	max = 3,
	className
}: Readonly<{ labels: ReadonlyArray<EntryLabel>; max?: number; className?: string }>) {
	if (labels.length === 0) {
		return null;
	}
	const shown = labels.slice(0, max);
	const hiddenCount = labels.length - shown.length;
	const names = labels.map((label) => label.name).join(', ');
	return (
		<span className={cn('flex min-w-0 flex-wrap items-center gap-1', className)} title={names}>
			{shown.map((label) => (
				<span
					key={label.id}
					className="inline-flex max-w-[9rem] items-center gap-1 rounded-full border border-gray-200 px-1.5 text-[11px] leading-4 text-gray-700 dark:border-gray-600 dark:text-gray-200"
				>
					<span
						aria-hidden="true"
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: label.color ?? FALLBACK_COLOR }}
					/>
					<span className="truncate">{label.name}</span>
				</span>
			))}
			{hiddenCount > 0 && <span className="text-[11px] text-gray-500 dark:text-gray-400">+{hiddenCount}</span>}
		</span>
	);
}
