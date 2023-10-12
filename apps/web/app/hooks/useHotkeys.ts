// useHotkeys.ts
import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';

export const useHotkeys = (key: string, callback: () => void) => {
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		hotkeys(key, (event, handler) => {
			event.preventDefault();
			callback();
		});

		return () => {
			hotkeys.unbind(key);
		};
	}, [key, callback]);
};

export const HostKeys = {
	START_TIMER: 'ctrl+option+],ctrl+alt+]',
	STOP_TIMER: 'ctrl+option+[,ctrl+alt+['
};
