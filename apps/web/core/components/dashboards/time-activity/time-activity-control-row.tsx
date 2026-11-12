import type { ReactNode } from 'react';

/**
 * The period and filter on one side, the switches on the other. Each side keeps its own width, so the switches move
 * to their own line when the row is too short for both, instead of squeezing the period and filter under them.
 */
export function TimeActivityControlRow({ leading, trailing }: Readonly<{ leading: ReactNode; trailing: ReactNode }>) {
	return (
		<div className="flex w-full flex-wrap items-center justify-between gap-2">
			<div className="flex min-w-0 flex-wrap items-center gap-2">{leading}</div>
			<div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{trailing}</div>
		</div>
	);
}
