import type { StoredSession } from '../../services/client/secure-session';

/** The fields of the authentication store that are the session itself, kept out of AsyncStorage. */
const SESSION_FIELDS = ['authToken', 'refreshToken', 'tempAuthToken'] as const;

type Fields = Record<string, unknown>;

function authenticationOf(snapshot: unknown): Fields | undefined {
	if (!snapshot || typeof snapshot !== 'object') {
		return undefined;
	}
	const authentication = (snapshot as Fields).authenticationStore;
	if (!authentication || typeof authentication !== 'object') {
		return undefined;
	}
	return authentication as Fields;
}

function asToken(value: unknown): string | undefined {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	return undefined;
}

/** The tokens a snapshot saved by a version before this one still carries. */
export function sessionInSnapshot(snapshot: unknown): StoredSession {
	const authentication = authenticationOf(snapshot);
	return {
		accessToken: asToken(authentication?.authToken),
		refreshToken: asToken(authentication?.refreshToken)
	};
}

export function withoutSession<T extends object>(snapshot: T): T {
	const authentication = authenticationOf(snapshot);
	if (!authentication) {
		return snapshot;
	}
	const kept: Fields = { ...authentication };
	for (const field of SESSION_FIELDS) {
		delete kept[field];
	}
	return { ...snapshot, authenticationStore: kept } as T;
}

/** Someone was signed in when this snapshot was saved, whatever happened to their tokens since. */
export function someoneWasSignedIn(snapshot: unknown): boolean {
	const authentication = authenticationOf(snapshot);
	const hasTenant = typeof authentication?.tenantId === 'string' && authentication.tenantId.length > 0;
	const hasUser = Boolean(authentication?.user);
	return hasTenant || hasUser;
}
