'use client';
import { TeamsProvider } from '@ever-teams/atoms';
import { ThemeProvider } from 'next-themes';

const teamsConfig = {
	apiUrl: process.env.NEXT_PUBLIC_TEAMS_API_URL
};

export default function ClientLayout({ children, lang }: { lang?: string; children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
			<TeamsProvider lang={lang} config={teamsConfig}>
				<main className=" dark:text-white text-black">{children}</main>
			</TeamsProvider>
		</ThemeProvider>
	);
}
