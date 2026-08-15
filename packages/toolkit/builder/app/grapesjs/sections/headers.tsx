'use client';
import Link from 'next/link';
import { TeamsLoginDialog, useTeamsContext } from '@ever-teams/atoms';
import { ThemeToggle } from '../../../components/layouts/footer/theme-toggle';
export function GrapesHeader() {
	const { authenticatedUser: user } = useTeamsContext();
	return (
		<nav className="sticky top-0 z-50 w-full bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
			<div className="container mx-auto px-4 py-4 flex flex-col gap-2">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-8">
						<Link href="/" className="text-xl font-bold text-slate-900 dark:text-slate-100">
							Teams GrapesJS Visual Editor
						</Link>
					</div>

					<div className="flex items-center gap-4">
						<ThemeToggle />
						<TeamsLoginDialog />
					</div>
				</div>
			</div>
		</nav>
	);
}
