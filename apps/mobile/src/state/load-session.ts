import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { readStoredSession } from '../../app/services/client/secure-session';
import { load } from '../../app/utils/storage';
import { sessionAtom, sessionStateFrom } from './session';

const ROOT_STATE_STORAGE_KEY = 'root-v1';

interface SavedAuthentication {
	tenantId?: string;
	organizationId?: string;
}

/** The workspace the current app saved with its state; the tokens themselves are in the secure storage. */
async function savedWorkspace(): Promise<SavedAuthentication> {
	const saved = await load(ROOT_STATE_STORAGE_KEY);
	const authentication: SavedAuthentication | undefined = saved?.authenticationStore;
	return {
		tenantId: authentication?.tenantId || undefined,
		organizationId: authentication?.organizationId || undefined
	};
}

/** Reads the session the current app saved, once, into the session state. */
export function useLoadSession(): void {
	const setSession = useSetAtom(sessionAtom);
	useEffect(() => {
		let active = true;
		const read = async () => {
			try {
				const [tokens, workspace] = await Promise.all([readStoredSession(), savedWorkspace()]);
				if (active) {
					setSession(sessionStateFrom({ ...tokens, ...workspace }));
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
