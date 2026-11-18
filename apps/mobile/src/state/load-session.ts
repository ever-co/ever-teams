import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { load } from '../../app/utils/storage';
import { restoreSessionState } from './restore-session';
import { sessionAtom } from './session';

const ROOT_STATE_STORAGE_KEY = 'root-v1';

/** Reads the session the current app saved, once, into the session state. */
export function useLoadSession(): void {
	const setSession = useSetAtom(sessionAtom);
	useEffect(() => {
		let active = true;
		const read = async () => {
			try {
				const snapshot = await load(ROOT_STATE_STORAGE_KEY);
				const state = await restoreSessionState(snapshot);
				if (active) {
					setSession(state);
				}
			} catch {
				// a secure storage that cannot be read holds no session the app can use
				if (active) {
					setSession({ status: 'signed-out' });
				}
			}
		};
		void read();
		return () => {
			active = false;
		};
	}, [setSession]);
}
