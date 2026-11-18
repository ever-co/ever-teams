'use client';

import { createContext, useContext } from 'react';
import type { IApiRequestConfig } from '@ever-teams/api';

// What a <TeamsProvider> tells the components and hooks under it. Its own module, free of UI imports, so hooks can
// read it without pulling in the kit root.
export interface KitOptions {
	// Whether the kit renders its own root (<TeamsProvider scopedStyles>) instead of relying on the host's page.
	scoped: boolean;
	// Called after a sign-out from the kit, instead of sending the browser to '/'.
	onSignOut?: () => void;
	// The host signs the person in from its backend (config.getToken): the kit asks for no password or token, reads
	// no organization list and stores no token.
	hostSignIn?: boolean;
	// Whether the widgets show "Powered by Ever Teams" (TeamsProvider's branding, on unless the host turns it off).
	branding?: boolean;
	// The provider's own API address (config.apiUrl), which its hooks pass to every request: two providers of a page
	// each reach their own. Without an apiUrl, the page's address (apiConfigManager), as it is now: the provider starts
	// afresh when it changes.
	api?: IApiRequestConfig;
}

const KitOptionsContext = createContext<KitOptions>({ scoped: false });

export const useKitOptions = (): KitOptions => useContext(KitOptionsContext);

export const KitOptionsProvider = KitOptionsContext.Provider;
