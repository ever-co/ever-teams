'use client';

import { useMemo } from 'react';
import { ThemeProvider } from '../components/layouts/theme-provider';
import { TeamsProvider } from '@ever-teams/atoms';

export function Providers({ apiUrl, children }: { apiUrl?: string; children: React.ReactNode }) {
	// The API URL arrives as a prop, read per request from the container env by the server root layout
	// (app/env.ts readRuntimeEnv). Never read process.env.NEXT_PUBLIC_* here: Next would inline the
	// value of whoever built the image.
	const teamsConfig = useMemo(() => ({ apiUrl }), [apiUrl]);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<TeamsProvider config={teamsConfig}>{children}</TeamsProvider>
		</ThemeProvider>
	);
}
