'use client';

import { ThemeProvider } from '../components/layouts/theme-provider';
import { TeamsProvider } from '@ever-teams/atoms';

const TEAMS_API_URL = process.env.NEXT_PUBLIC_TEAMS_API_URL;

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<TeamsProvider config={{ apiUrl: TEAMS_API_URL }}>{children}</TeamsProvider>
		</ThemeProvider>
	);
}
