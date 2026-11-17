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
	await forgetPartialSession();
	return false;
}

/**
 * A move that failed halfway must leave nothing: the session stays in root-v1 for this launch, and a token left here
 * would be read back at the next launch even after the person signed out.
 */
async function forgetPartialSession(): Promise<void> {
	try {
		await writeStoredSession({});
	} catch {
		// the storage refuses everything: there is nothing left in it to forget
	}
}
