'use client';

import { ComponentType, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@ever-teams/toolkit-ui';
import { Users, Settings, Shield, Activity, LayoutDashboardIcon, CircleIcon } from 'lucide-react';
import {
	TeamsBasicTimer,
	TeamsActiveOrganizationSelector,
	TeamsActiveTeamSelector,
	TeamsReportDatesRangePicker,
	TeamsTeamCreationFormDialog,
	TeamsThemeToggle,
	useTeamsContext,
	TeamsActiveEmployeeSelector
} from '@ever-teams/atoms';
import { UserAvatarDropdown } from '@/components/auth/user-avatar-dropdown';
import { useUser } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { DashboardFooter } from '@/components/dashboard/footer';
import { User } from '@/lib/db/schema';
import { Logo } from '@/components/ui/logo';

function DashboardHeader() {
	const { authenticatedUser: teamsUser } = useTeamsContext();
	const { userPromise } = useUser();
	const t = useTranslations('Navigation');
	const [localUser, setLocalUser] = useState<User | null>(null);
	const [, setIsLoading] = useState(true);

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
			} finally {
				setIsLoading(false);
			}
		};

		loadUser();
	}, [userPromise]);

	// Show components only if both local and Teams users are authenticated

	return (
		<div className=" flex gap-7 border-l-[1px] border-b-[1px] dark:border-gray-700 px-5 py-2 items-center md:w-full justify-between self-end h-20 bg-white dark:bg-zinc-950">
			{teamsUser && (
				<span className="dark:text-white">
					<TeamsBasicTimer background="primary" color="destructive" readonly rounded="small" />
				</span>
			)}
			<div className="flex justify-center items-center gap-4">
				{localUser && (
					<Link
						className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
						href="/pricing"
					>
						{t('pricing')}
					</Link>
				)}

				{/* <TeamsActiveEmployeeSelector labeled={false} />
						<TeamsActiveTeamSelector className="w-48" />
						<TeamsActiveOrganizationSelector className="min-w-48" />
						<TeamsReportDatesRangePicker /> */}
				<UserAvatarDropdown />
			</div>
		</div>
	);
}

export default function DashboardLayout({ children }: { children: ReactNode }): ReactNode {
	const [, setIsSidebarOpen] = useState(false);

	const t = useTranslations('Dashboard');
	const pathname = usePathname();

	const navItems: Array<{
		href:
			| '/'
			| '/dashboard'
			| '/dashboard/team'
			| '/dashboard/general'
			| '/dashboard/activity'
			| '/dashboard/security';
		icon: ComponentType<{ className?: string; size?: string | number }>;
		label: string;
	}> = [
		{ href: '/dashboard', icon: LayoutDashboardIcon, label: t('title') },
		{ href: '/dashboard/team', icon: Users, label: t('team') },
		{ href: '/dashboard/general', icon: Settings, label: t('general') },
		{ href: '/dashboard/activity', icon: Activity, label: t('activity') },
		{ href: '/dashboard/security', icon: Shield, label: t('security') }
	];

	return (
		<div className="w-screen overflow-x-hidden relative bg-white h-screen grid  md:grid-cols-[256px_1fr] grid-rows-[80px_1fr]">
			<DashboardHeader />

			<aside
				className={`dark:bg-zinc-950 flex  w-64 px-3 row-start-1 row-end-3  h-full  bg-white flex-col gap-4 overflow-y-auto p-4 dark:border-gray-700`}
			>
				<Link className="pb-5 pt-3 pl-2 border-b dark:border-gray-700" href={'/'}>
					<Logo />
				</Link>

				<nav className="flex flex-col gap-1">
					{navItems.map((item) => (
						<Link key={item.href} href={item.href} passHref>
							<Button
								variant={pathname === item.href ? 'secondary' : 'ghost'}
								className={`shadow-none  w-full justify-start ${
									pathname === item.href ? 'bg-gray-100 dark:bg-gray-800' : ''
								}`}
								onClick={() => setIsSidebarOpen(false)}
							>
								<item.icon className="mr-3 text-gray-400" size={16} />
								<span className={`text-sm ${pathname === item.href ? 'font-bold' : ''}`}>
									{item.label}
								</span>
							</Button>
						</Link>
					))}
				</nav>
			</aside>

			<section className="flex flex-col border-l-[1px] dark:border-gray-700 w-full dark:bg-zinc-900 ">
				<div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-5">{children}</div>
				<DashboardFooter />
			</section>
		</div>
	);
}
