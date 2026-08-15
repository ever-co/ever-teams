'use client';

import { TeamsThemeToggle, ThemeToggle } from '@ever-teams/atoms';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ReactElement } from 'react';

export function DashboardFooter(): ReactElement {
	return (
		<footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-950 px-4 py-3">
			<div className="flex items-center justify-between max-w-full">
				{/* Left side - could be used for additional info in the future */}
				<div className="flex items-center gap-4">
					<span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">© 2024 Teams</span>
				</div>

				{/* Right side - Theme toggle and Language switch */}
				<div className="flex flex-wrap flex-col md:flex-row gap-4">
					<TeamsThemeToggle />

					<LanguageSwitcher />

					<div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
					<ThemeToggle />
				</div>
			</div>
		</footer>
	);
}
