import type { createStore } from 'jotai';
import type { SessionHolder } from '../../app/services/client/session';
import { keepStoredSessionInOrder } from '../../app/services/client/secure-session';
import { sessionAtom } from './session';
import type { Session } from './session';

type Store = ReturnType<typeof createStore>;

function signedInSession(store: Store): Session | undefined {
	const state = store.get(sessionAtom);
	if (state.status !== 'signed-in') {
		return undefined;
	}
	return state.session;
}

/**
 * What the HTTP client renews the new app's session through (services/client/session.ts): the session state, and
 * the tokens saved in secure storage, as the current app's authentication store does.
 *
 * @param store - The Jotai store the screens read the session from.
 * @param forgetData - Drops what was loaded for the person whose session ends.
 */
export function sessionHolderOf(store: Store, forgetData: () => void): SessionHolder {
	return {
		tokens: () => {
			const session = signedInSession(store);
			return { accessToken: session?.accessToken, refreshToken: session?.refreshToken };
		},
		keep: ({ accessToken, refreshToken }) => {
			const session = signedInSession(store);
			if (!session) {
				return;
			}
			// Gauzy rotates the refresh token: the one just sent is refused from now on
			const renewed: Session = { ...session, accessToken, refreshToken: refreshToken ?? session.refreshToken };
			store.set(sessionAtom, { status: 'signed-in', session: renewed });
			void keepStoredSessionInOrder({ accessToken: renewed.accessToken, refreshToken: renewed.refreshToken });
		},
		end: () => {
			store.set(sessionAtom, { status: 'signed-out' });
			void keepStoredSessionInOrder({});
			forgetData();
		}
	};
}
