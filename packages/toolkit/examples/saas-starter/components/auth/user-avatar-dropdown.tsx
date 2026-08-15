'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, LogOut, ChevronDown } from 'lucide-react';
import { useTeamsContext, useAccessToken } from '@ever-teams/atoms';
import { Avatar } from '@ever-teams/toolkit-ui';
import { signOut } from '@/app/(login)/actions';
import { useUser } from '@/lib/auth';
import Link from 'next/link';
import { User } from '@/lib/db/schema';

interface UserAvatarDropdownProps {
	className?: string;
}

export function UserAvatarDropdown({ className = '' }: UserAvatarDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const t = useTranslations('Navigation');
	const [userLoading, setUserLoading] = useState(true);

	const { userPromise } = useUser();
	const { authenticatedUser: teamsUser, setAuthenticatedUser: setTeamsUser } = useTeamsContext();
	const [localUser, setLocalUser] = useState<User | null>(null);

	// Load local user data
	useEffect(() => {
		const loadUser = async () => {
			try {
				if (!userPromise) return;
				const user = await userPromise;
				setLocalUser(user);
				setUserLoading(false);
			} catch (error) {
				setUserLoading(false);
				setLocalUser(null);
			}
		};
		loadUser();
	}, [userPromise]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	// Close dropdown on escape key
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			return () => document.removeEventListener('keydown', handleEscape);
		}
	}, [isOpen]);

	const handleLogout = async () => {
		if (isLoggingOut) return;

		setIsLoggingOut(true);
		setIsOpen(true);

		try {
			// Clear local user data
			await signOut();
			setLocalUser(null);

			// Clear Teams user data
			if (typeof window !== 'undefined') {
				const resetStore = {
					app: { user: null },
					persist: { token: null }
				};
				window.localStorage.setItem('_teams-store', JSON.stringify(resetStore));
				setTeamsUser({ data: null, loading: false });
			}
			// Reload to reset Teams context values
			window.location.reload();

			// Redirect to sign-in page
			router.push('/sign-in');
		} catch (error) {
			console.error('Logout error:', error);
			// Force redirect even if there's an error
			router.push('/sign-in');
		} finally {
			setIsLoggingOut(false);
			setIsOpen(false);
		}
	};

	// Show loading state if we're still loading user data
	if (userLoading) {
		return (
			<div className="flex items-center space-x-2 p-1">
				<div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
				<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	// Don't render if local user is not authenticated
	if (!localUser) {
		return null;
	}

	// Display local user data (name, email) but use Teams avatar if available
	const userName = localUser.name || 'User';
	const userEmail = localUser.email || '';
	const userInitials =
		userName
			.split(' ')
			.map((name: string) => name.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2) || 'U';
	// Prefer Teams avatar image, fallback to local user image
	const avatarUrl = teamsUser?.imageUrl || '';

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			{/* Avatar Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
				aria-expanded={isOpen}
				aria-haspopup="true"
				aria-label={t('user_menu')}
			>
				<div className="relative">
					{userLoading && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full">
							<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						</div>
					)}
					<Avatar title={userName} fallback={userInitials} src={avatarUrl} className="w-8 h-8 rounded-full" />
				</div>
				<ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
					{/* User Info Section */}
					<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center space-x-3">
							<Avatar
								title={userName}
								fallback={userInitials}
								src={avatarUrl}
								className="w-12 h-12 rounded-full"
							/>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
								<p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
							</div>
						</div>
					</div>

					{/* Menu Items */}
					<div className="py-1">
						{/* Dashboard Link */}

						<Link
							href="/dashboard"
							className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							onClick={() => setIsOpen(false)}
						>
							<Home className="w-4 h-4 mr-3" />
							{t('dashboard')}
						</Link>

						{/* Logout Button */}
						<button
							onClick={handleLogout}
							disabled={isLoggingOut}
							className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoggingOut ? (
								<>
									<div className="w-4 h-4 mr-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
									Signing out...
								</>
							) : (
								<>
									<LogOut className="w-4 h-4 mr-3" />
									{t('sign_out')}
								</>
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
