'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';
import { TeamsProvider } from '@ever-teams/atoms';
import { Footer } from '@/components/footer';
import { useMemo } from 'react';

export default function ClientLayout({ apiUrl, children }: { apiUrl?: string; children: React.ReactNode }) {
	// The API URL arrives as a prop, read per request from the container env by the server root layout
	// (src/lib/runtime-env.ts). Never read process.env.NEXT_PUBLIC_* here: Next would inline the value
	// of whoever built the image.
	const teamsConfig = useMemo(() => ({ apiUrl }), [apiUrl]);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<TeamsProvider config={teamsConfig}>
				<div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
					<Sidebar />
					<div className="flex-1 flex flex-col">
						<TopBar />
						<main className="flex-1 p-6 overflow-y-auto">
							<div className="mx-auto ">
								<div className="rounded-xl border border-slate-200 bg-white/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/50 p-6">
									{children}
								</div>
							</div>
						</main>
						<Footer />
					</div>
				</div>
			</TeamsProvider>
		</ThemeProvider>
	);
}
