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
