'use client';

import { createContext, useContext, useMemo } from 'react';
import { ThemeProvider } from '../components/layouts/theme-provider';
import { TeamsProvider } from '@ever-teams/atoms';

// The Ever Teams API this builder signs in to, for the pages that must not talk to another one with its session.
const BuilderApiUrlContext = createContext<string | undefined>(undefined);

export const useBuilderApiUrl = (): string | undefined => useContext(BuilderApiUrlContext);

export function Providers({ apiUrl, children }: { apiUrl?: string; children: React.ReactNode }) {
	// The API URL arrives as a prop, read per request from the container env by the server root layout
	// (app/env.ts readRuntimeEnv). Never read process.env.NEXT_PUBLIC_* here: Next would inline the
	// value of whoever built the image.
	const teamsConfig = useMemo(() => ({ apiUrl }), [apiUrl]);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<BuilderApiUrlContext.Provider value={apiUrl}>
				<TeamsProvider config={teamsConfig}>{children}</TeamsProvider>
			</BuilderApiUrlContext.Provider>
		</ThemeProvider>
	);
}
