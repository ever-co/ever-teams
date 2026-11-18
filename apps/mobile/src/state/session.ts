import { atom } from 'jotai';

/** The tokens and the workspace of the person signed in, as the current app keeps them. */
export interface Session {
	accessToken: string;
	refreshToken?: string;
	tenantId?: string;
	organizationId?: string;
}

export type SessionState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; session: Session };

/** Where the session stands: read once at start from what the current app saved, then kept here. */
export const sessionAtom = atom<SessionState>({ status: 'loading' });

export const isSignedInAtom = atom((get) => get(sessionAtom).status === 'signed-in');

function base64ToText(base64url: string): string {
	const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/');
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	return atob(base64 + padding);
}

/**
 * The person a session is: the user id Gauzy's access token carries. The keys of the person's own answers carry it, so
 * the saved answers of someone who used the phone before never show. Empty when the token cannot be read.
 */
export function accountOf(session: Session): string {
	const payload = session.accessToken.split('.')[1];
	if (!payload) {
		return '';
	}
	try {
		const claims = JSON.parse(base64ToText(payload)) as { id?: unknown };
		if (typeof claims.id === 'string') {
			return claims.id;
		}
		return '';
	} catch {
		return '';
	}
}

/** The state for what was read at start: a session needs an access token. */
export function sessionStateFrom(session: Partial<Session> | null): SessionState {
	const accessToken = session?.accessToken;
	if (!accessToken) {
		return { status: 'signed-out' };
	}
	return {
		status: 'signed-in',
		session: {
			accessToken,
			refreshToken: session?.refreshToken,
			tenantId: session?.tenantId,
			organizationId: session?.organizationId
		}
	};
}
