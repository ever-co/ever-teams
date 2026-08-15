'use client';

import { Menu, X } from 'lucide-react';
import { ThemeToggle, useTeamsContext } from '@ever-teams/atoms';
import { cn } from '@ever-teams/toolkit-ui';
import Link from 'next/link';
import { ReactElement, ReactNode, useEffect } from 'react';
import { Footer } from '../footer/Footer';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '../language-switcher';
import { UserAvatarDropdown } from '../auth/user-avatar-dropdown';
import { useUser } from '@/lib/auth';
import { User } from '@/lib/db/schema';
import { Logo } from '../ui/logo';

function UserMenu(): ReactElement {
	const { authenticatedUser: teamsUser } = useTeamsContext();
	const { userPromise } = useUser();
	const t = useTranslations('Navigation');
	const [localUser, setLocalUser] = useState<User | null>(null);

	// Load local user data
	useEffect(() => {
		const loadUser = async () => {
			try {
				if (userPromise && typeof userPromise.then === 'function') {
					const user = await userPromise;
					setLocalUser(user);
				}
			} catch (error) {
				setLocalUser(null);
			}
		};

		loadUser();
	}, [userPromise]);

	// Show avatar dropdown only if both local and Teams users are authenticated
	const isAuthenticated = localUser && teamsUser;

	return (
		<>
			{isAuthenticated ? (
				<UserAvatarDropdown />
			) : (
				<Link
					className="bg-gradient-to-r py-2 px-4 rounded from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:scale-105 duration-300 transition-all"
					href="/sign-in"
				>
					{t('sign_in')}
				</Link>
			)}
		</>
	);
}

function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const t = useTranslations('Navigation');

	return (
		<nav className="w-full relative z-[51] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-white/20 dark:border-slate-800/50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center py-4 space-x-4 ">
					<div className="flex items-center">
						<Link href={'/'}>
							<Logo />
						</Link>
					</div>

					<div className="hidden md:block">
						<div className="ml-10 flex items-baseline space-x-8">
							{[
								{ name: 'features', href: '/#features', label: t('features') },
								{ name: 'pricing', href: '/#pricing', label: t('pricing') },
								{ name: 'testimonials', href: '/#testimonials', label: t('testimonials') },
								{ name: 'faq', href: '/#faq', label: t('faq') }
							].map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
								>
									{item.label}
								</Link>
							))}
						</div>
					</div>

					<div className="hidden md:flex items-center space-x-4">
						<LanguageSwitcher />
						<ThemeToggle />
						<div className="flex items-center space-x-4">
							<UserMenu />
						</div>
					</div>

					<div className="md:hidden flex items-center space-x-2">
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="text-slate-700 dark:text-slate-300"
							aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
							aria-expanded={mobileMenuOpen}
						>
							{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-white/20 dark:border-slate-800/50">
					<div className="px-2 pt-2 pb-3 space-y-1">
						{[
							{ name: 'features', href: '#features', label: t('features') },
							{ name: 'pricing', href: '#pricing', label: t('pricing') },
							{ name: 'testimonials', href: '#testimonials', label: t('testimonials') },
							{ name: 'faq', href: '#faq', label: t('faq') }
						].map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className="block px-3 py-2 text-slate-700 dark:text-slate-300"
							>
								{item.label}
							</Link>
						))}
					</div>
				</div>
			)}
		</nav>
	);
}

export default function HomeLayout({ className, children }: { className?: string; children: ReactNode }): ReactElement {
	return (
		<main className={cn('min-h-screen flex justify-between items-center flex-col w-full', className)}>
			<Header />
			{children}
			<Footer />
		</main>
	);
}
