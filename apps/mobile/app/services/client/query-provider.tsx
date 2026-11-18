import React, { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The app's one query client, created once outside React: a client made during a render would be replaced, with its
 * cache, each time the navigator renders again, which a change of the phone's light or dark mode now does.
 */
export const queryClient = new QueryClient();

/**
 * Several query keys carry no account or workspace, so the client forgets every answer once nobody is signed in: the
 * next person to sign in on this phone never sees the previous one's data.
 */
export function AppQueryProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
	useEffect(() => {
		if (!signedIn) {
			queryClient.clear();
		}
	}, [signedIn]);
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
