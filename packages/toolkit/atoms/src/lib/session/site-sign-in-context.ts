'use client';

import { createContext, useContext } from 'react';

// Where the popup of a sign-in with Ever Teams stands: none open, open and waiting for the person, or blocked by the
// browser.
export type SiteSignInStatus = 'idle' | 'waiting' | 'blocked';

export interface SiteSignInControls {
	status: SiteSignInStatus;
	// Opens the web app's popup, or brings the open one forward: call it from a click.
	signIn: () => void;
	// Ends the sign-in at the API, forgets it, and shows the person as signed out.
	signOut: () => Promise<void>;
}

// Null unless the provider signs people in with Ever Teams (config.signIn 'ever-teams').
export const SiteSignInContext = createContext<SiteSignInControls | null>(null);

export const useSiteSignIn = (): SiteSignInControls | null => useContext(SiteSignInContext);
