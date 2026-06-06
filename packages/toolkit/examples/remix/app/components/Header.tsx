import { Link, useLocation } from '@remix-run/react';
import { TeamsLogo } from '@ever-teams/toolkit-ui';
import { TeamsLoginDialog, ThemeToggle } from '@ever-teams/atoms';

export function Header() {
	const location = useLocation();

	const getLinkClassName = (path: string) => {
		const isActive = location.pathname === path;
		const baseClasses = 'px-4 py-2 transition-colors';
		const activeClasses = 'text-blue-600 dark:text-blue-400 font-medium';
		const inactiveClasses = 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';

		return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
	};

	return (
		<div className="w-full fixed top-0 left-0 right-0 z-50 px-4 py-3">
			<header className="container mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50">
				<div className="px-6 mx-auto">
					<div className="flex justify-between items-center h-16">
						{/* Left section - Logo and Navigation */}
						<div className="flex items-center gap-8">
							<Link to="/" prefetch="intent" className="flex items-center gap-2">
								<TeamsLogo className="h-6 w-auto" />
							</Link>

							<nav className="flex items-center">
								<Link to="/" prefetch="intent" className={getLinkClassName('/')}>
									Home
								</Link>
								<Link to="/components" prefetch="intent" className={getLinkClassName('/components')}>
									Components
								</Link>
							</nav>
						</div>

						{/* Right section - Login Dialog and Theme Toggle */}
						<div className="flex items-center gap-4">
							<ThemeToggle />
							<TeamsLoginDialog />
						</div>
					</div>
				</div>
			</header>
		</div>
	);
}
