import { useEffect, useState } from 'react';

const TAB_BUTTONS_WAIT_MS = 3000;

let tabButtonsShown = false;

/**
 * Whether the tab buttons still wait for the first screens: once per app start. The navigator mounts again when the
 * language changes, and the buttons stay as they were.
 */
export function useTabButtonsLoading(): boolean {
	const [loading, setLoading] = useState(() => !tabButtonsShown);
	useEffect(() => {
		if (!loading) {
			return undefined;
		}
		const timer = setTimeout(() => {
			tabButtonsShown = true;
			setLoading(false);
		}, TAB_BUTTONS_WAIT_MS);
		return () => clearTimeout(timer);
	}, [loading]);
	return loading;
}
