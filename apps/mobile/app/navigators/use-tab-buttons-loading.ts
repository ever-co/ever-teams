import { useEffect, useState } from 'react';

const TAB_BUTTONS_WAIT_MS = 3000;

let tabButtonsDeadline: number | undefined;
let tabButtonsWaited = false;

// The wait starts with the first tabs of this app start, and a navigator that mounts again only waits what is left.
// Once over it stays over, and it never grows past its length when the phone's clock moves back.
function waitLeftMs(): number {
	if (tabButtonsWaited) {
		return 0;
	}
	const now = Date.now();
	if (tabButtonsDeadline === undefined) {
		tabButtonsDeadline = now + TAB_BUTTONS_WAIT_MS;
	}
	const left = Math.min(TAB_BUTTONS_WAIT_MS, Math.max(0, tabButtonsDeadline - now));
	if (left === 0) {
		tabButtonsWaited = true;
	}
	return left;
}

function endWait(setLoading: (loading: boolean) => void): void {
	tabButtonsWaited = true;
	setLoading(false);
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
		const timer = setTimeout(() => endWait(setLoading), waitLeftMs());
		return () => clearTimeout(timer);
	}, [loading]);
	return loading;
}
