'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';
import { TeamsProvider } from '@ever-teams/atoms';
import { Footer } from '@/components/footer';

const teamsConfig = {
	apiUrl: process.env.NEXT_PUBLIC_TEAMS_API_URL
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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
