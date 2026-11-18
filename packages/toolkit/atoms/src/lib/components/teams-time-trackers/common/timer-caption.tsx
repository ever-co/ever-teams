import type { ReactNode } from 'react';

/**
 * The word a timer shows before its time (by default "Today": the timers show the time tracked today), small and quiet
 * next to the digits. Nothing for an empty caption, so a host can drop it with `caption={null}`.
 */
export function TimerCaption({ children }: Readonly<{ children?: ReactNode }>) {
	const empty = children === null || children === undefined || children === false || children === '';
	if (empty) {
		return null;
	}
	return <span className="shrink-0 text-[11px] leading-none font-medium text-muted-foreground">{children}</span>;
}
