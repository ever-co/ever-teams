'use client';

import { atom } from 'jotai';
import { createContext, useContext } from 'react';

// Where the host's sign-in stands: before the first answer of getToken, signed in with a token, or signed out (the
// host's backend gave no token: the person is not signed in to the host product).
export type HostSessionStatus = 'pending' | 'signed-in' | 'signed-out';

export interface HostSession {
	status: HostSessionStatus;
	// The organization the host's token was issued for (its claims): the kit reads no organization list in this mode.
	organizationId: string | null;
	// Signed out because Ever Teams refused the person (EMBED_MEMBER_NOT_ALLOWED), not because the host signed them out.
	refused?: boolean;
}

export const hostSessionAtom = atom<HostSession>({ status: 'pending', organizationId: null });

// Asks the host for a token now (the "Sign in again" of a session that ended); null without getToken.
export const HostSignInContext = createContext<(() => Promise<void>) | null>(null);

export const useHostSignIn = (): (() => Promise<void>) | null => useContext(HostSignInContext);
