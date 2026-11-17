/**
 * This file is where we do "rehydration" of your RootStore from AsyncStorage.
 * This lets you persist your state between app launches.
 *
 * Navigation state persistence is handled in navigationUtilities.tsx.
 *
 * Note that Fast Refresh doesn't play well with this file, so if you edit this,
 * do a full refresh of your app instead.
 *
 * @refresh reset
 */
import { comparer, reaction } from 'mobx';
import { applySnapshot, getSnapshot, IDisposer, onSnapshot } from 'mobx-state-tree';
import type { RootStore } from '../root-store';
import * as storage from '../../utils/storage';
import {
	forgetStoredSession,
	hasTokens,
	moveSessionToSecureStorage,
	readStoredSession,
	StoredSession,
	keepStoredSessionInOrder
} from '../../services/client/secure-session';
import { sessionInSnapshot, someoneWasSignedIn, withoutSession } from './session-snapshot';

/**
 * The key we'll be saving our state as within async storage.
 */
const ROOT_STATE_STORAGE_KEY = 'root-v1';

/** Where the session is after startup, and whether the person must be told it ended. */
interface RestoredSession {
	/** The secure storage holds the session: the AsyncStorage snapshot is saved without it. */
	inSecureStorage: boolean;
	ended: boolean;
}

async function restoreSession(rootStore: RootStore, restoredState: unknown): Promise<RestoredSession> {
	const authentication = rootStore.authenticationStore;
	const sessionOfAnEarlierVersion = sessionInSnapshot(restoredState);

	if (hasTokens(sessionOfAnEarlierVersion)) {
		// The snapshot already put these tokens in the store: the person stays signed in either way. When the move
		// fails, they stay in the snapshot and the move is tried again at the next launch.
		const moved = await moveSessionToSecureStorage(sessionOfAnEarlierVersion);
		return { inSecureStorage: moved, ended: false };
	}

	let stored: StoredSession;
	try {
		stored = await readStoredSession();
	} catch {
		// The Keystore key can be gone, after a device restore for one: the tokens cannot be decrypted anymore
		const ended = someoneWasSignedIn(restoredState);
		if (ended) {
			authentication.logout();
		}
		await forgetStoredSession();
		return { inSecureStorage: true, ended };
	}
	// logout() clears the tenant and the user, which the snapshot keeps: tokens found while it says nobody is signed in
	// were left by a sign-out whose delete did not go through, or by an iOS Keychain that outlived the app
	const signedOut = !someoneWasSignedIn(restoredState);
	const leftOver = signedOut && hasTokens(stored);
	if (leftOver) {
		await forgetStoredSession();
		return { inSecureStorage: true, ended: false };
	}
	authentication.setAuthToken(stored.accessToken);
	authentication.setRefreshToken(stored.refreshToken ?? '');
	return { inSecureStorage: true, ended: false };
}

/**
 * Setup the root state.
 */
let _disposer: IDisposer | undefined;
export async function setupRootStore(rootStore: RootStore) {
	let restoredState: any;

	try {
		// load the last known state from AsyncStorage
		restoredState = (await storage.load(ROOT_STATE_STORAGE_KEY)) || {};
		applySnapshot(rootStore, restoredState);
	} catch (error) {
		// if there's any problems loading, then inform the dev what happened
		if (__DEV__) {
			const message = String((error as Error)?.message ?? error);
			console.tron.error(message, null);
		}
	}

	const session = await restoreSession(rootStore, restoredState);

	// stop tracking state changes if we've already setup
	if (_disposer) _disposer();

	// track changes & save to AsyncStorage, the session aside
	const stopSaving = onSnapshot(rootStore, (snapshot) => {
		if (session.inSecureStorage) {
			storage.save(ROOT_STATE_STORAGE_KEY, withoutSession(snapshot));
			return;
		}
		storage.save(ROOT_STATE_STORAGE_KEY, snapshot);
	});
	if (session.inSecureStorage) {
		await storage.save(ROOT_STATE_STORAGE_KEY, withoutSession(getSnapshot(rootStore)));
	}

	// each new pair of tokens (sign-in, renewal, sign-out) goes to the secure storage
	const authentication = rootStore.authenticationStore;
	const stopKeepingSession = reaction(
		() => ({ accessToken: authentication.authToken, refreshToken: authentication.refreshToken }),
		(tokens) => {
			if (!session.inSecureStorage) {
				return;
			}
			keepStoredSessionInOrder(tokens);
		},
		{ equals: comparer.structural }
	);

	_disposer = () => {
		stopSaving();
		stopKeepingSession();
	};

	const unsubscribe = () => {
		_disposer?.();
		_disposer = undefined;
	};

	return { rootStore, restoredState, unsubscribe, sessionEnded: session.ended };
}
