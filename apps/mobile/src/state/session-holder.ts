import type { createStore } from 'jotai';
import { sessionInSnapshot, withoutSession } from '../../app/models/helpers/session-snapshot';
import type { SessionHolder } from '../../app/services/client/session';
import { hasTokens, keepStoredSessionInOrder, readStoredSession } from '../../app/services/client/secure-session';
import type { StoredSession } from '../../app/services/client/secure-session';
import { load, save } from '../../app/utils/storage';
import { ROOT_STATE_STORAGE_KEY } from './load-session';
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
 * Tokens an earlier version left in the current app's saved state come first at the next start (restore-session.ts):
 * once the session the screens hold lives in secure storage, they are taken out, so the next start reads that one.
 */
async function forgetTokensOfAnEarlierVersion(): Promise<void> {
	const snapshot = await load(ROOT_STATE_STORAGE_KEY);
	if (!hasTokens(sessionInSnapshot(snapshot))) {
		return;
	}
	await save(ROOT_STATE_STORAGE_KEY, withoutSession(snapshot));
}

function readStoredOrNone(): Promise<StoredSession> {
	return readStoredSession().catch(() => ({}));
}

/**
 * Saves a renewed pair. The saved state of an earlier version gives up its tokens only once secure storage reads the
 * pair back: Gauzy accepts a refresh token once, so a start that read the old one would end the session.
 */
export async function keepRenewedPair(pair: StoredSession): Promise<void> {
	await keepStoredSessionInOrder(pair);
	const stored = await readStoredOrNone();
	if (stored.accessToken === pair.accessToken) {
		await forgetTokensOfAnEarlierVersion();
	}
}

/** Forgets an ended session wherever a start could read it again. */
export async function forgetEndedSession(): Promise<void> {
	await keepStoredSessionInOrder({});
	await forgetTokensOfAnEarlierVersion();
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
			void keepRenewedPair({ accessToken: renewed.accessToken, refreshToken: renewed.refreshToken });
		},
		end: () => {
			store.set(sessionAtom, { status: 'signed-out' });
			void forgetEndedSession();
			forgetData();
		}
	};
}
