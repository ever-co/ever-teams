import * as SecureStore from 'expo-secure-store';

/**
 * The session's tokens. They live in the Keychain on iOS and are encrypted with the Android Keystore, never in
 * AsyncStorage: the refresh token can mint access tokens for days.
 */
export interface StoredSession {
	accessToken?: string;
	refreshToken?: string;
}

const ACCESS_TOKEN_KEY = 'ever-teams.session.access-token';
const REFRESH_TOKEN_KEY = 'ever-teams.session.refresh-token';

async function keepOrForget(key: string, value: string | undefined): Promise<void> {
	if (value) {
		await SecureStore.setItemAsync(key, value);
		return;
	}
	await SecureStore.deleteItemAsync(key);
}

export async function readStoredSession(): Promise<StoredSession> {
	const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
	const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
	return { accessToken: accessToken ?? undefined, refreshToken: refreshToken ?? undefined };
}

/** An empty token removes the stored one: signing out forgets the session. */
export async function writeStoredSession(session: StoredSession): Promise<void> {
	await keepOrForget(ACCESS_TOKEN_KEY, session.accessToken);
	await keepOrForget(REFRESH_TOKEN_KEY, session.refreshToken);
}

let pendingWrites: Promise<void> = Promise.resolve();

/**
 * Saves each pair after the previous one: a sign-in or a renewal changes both tokens one after the other, and two
 * writes running side by side could finish in the wrong order and keep a refresh token the server already rotated.
 */
export function keepStoredSessionInOrder(session: StoredSession): Promise<void> {
	pendingWrites = pendingWrites.then(() => writeStoredSession(session)).catch(() => undefined);
	return pendingWrites;
}

export function hasTokens(session: StoredSession): boolean {
	return Boolean(session.accessToken || session.refreshToken);
}

/**
 * Writes the session, then reads it back.
 *
 * @returns true only when the secure storage now holds exactly that session, so the caller may forget its copy.
 */
export async function moveSessionToSecureStorage(session: StoredSession): Promise<boolean> {
	try {
		await writeStoredSession(session);
		const stored = await readStoredSession();
		const sameAccessToken = stored.accessToken === session.accessToken;
		const sameRefreshToken = stored.refreshToken === session.refreshToken;
		if (sameAccessToken && sameRefreshToken) {
			return true;
		}
	} catch {
		// what was written is forgotten below
	}
	await forgetStoredSession();
	return false;
}

/**
 * Deletes both tokens, and never throws: a move that failed halfway, or tokens nobody may sign in with anymore, must
 * not be read back at a later launch.
 */
export async function forgetStoredSession(): Promise<void> {
	try {
		await writeStoredSession({});
	} catch {
		// the storage refuses everything: there is nothing left in it to forget
	}
}
