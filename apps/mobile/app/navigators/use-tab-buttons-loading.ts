import { useEffect, useState } from 'react';

const TAB_BUTTONS_WAIT_MS = 3000;

let tabButtonsDeadline: number | undefined;

// The wait starts with the first tabs of this app start, and a navigator that mounts again only waits what is left
function waitLeftMs(): number {
	if (tabButtonsDeadline === undefined) {
		tabButtonsDeadline = Date.now() + TAB_BUTTONS_WAIT_MS;
	}
	return Math.max(0, tabButtonsDeadline - Date.now());
}

/**
 * Whether the tab buttons still wait for the first screens: once per app start. The navigator mounts again when the
 * language changes or a screen outside the tabs opens, and the buttons stay as they were.
 */
export function useTabButtonsLoading(): boolean {
	const [loading, setLoading] = useState(() => waitLeftMs() > 0);
	useEffect(() => {
		if (!loading) {
			return undefined;
		}
		const timer = setTimeout(() => setLoading(false), waitLeftMs());
		return () => clearTimeout(timer);
	}, [loading]);
	return loading;
}
