'use client';
import { TeamsProvider } from '@ever-teams/atoms';
import { ThemeProvider } from 'next-themes';
import { useMemo } from 'react';

export default function ClientLayout({
	apiUrl,
	children,
	lang
}: {
	apiUrl?: string;
	lang?: string;
	children: React.ReactNode;
}) {
	// The API URL arrives as a prop, read per request from the container env by the server root layout
	// (src/libs/runtime-env.ts). Never read process.env.NEXT_PUBLIC_* here: Next would inline the value
	// of whoever built the image.
	const teamsConfig = useMemo(() => ({ apiUrl }), [apiUrl]);

	return (
		<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
			<TeamsProvider lang={lang} config={teamsConfig}>
				<main className=" dark:text-white text-black">{children}</main>
			</TeamsProvider>
		</ThemeProvider>
	);
}
