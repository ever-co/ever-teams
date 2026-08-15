'use client';

import { useState, useEffect, ReactElement } from 'react';
import {
	TeamsAppsUrlList,
	TeamsChart,
	TeamsProjectsList,
	TeamsTasksList,
	TeamsDailyActivityDisplayer,
	TeamsDailyWorkedTimeDisplayer,
	TeamsModernTimer,
	TeamsWeeklyActivityDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsWorkedProjectDisplayer,
	useTeamsContext
} from '@ever-teams/atoms';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/auth';
import { User } from '@/lib/db/schema';

export default function DashboardPage(): ReactElement {
	const t = useTranslations('Dashboard');
	const {
		authenticatedUser: teamsUser,
		loadings: { userLoading }
	} = useTeamsContext();
	const { userPromise } = useUser();
	const [localUser, setLocalUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

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

	// Show loading state while checking authentication
	if (isLoading || userLoading) {
		return (
			<section className="flex flex-col w-full gap-5">
				<div className="mb-4">
					<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
					<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
				</div>
				<div className="flex flex-wrap gap-2">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="h-32 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
					))}
				</div>
				<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
			</section>
		);
	}

	return (
		<section className="flex flex-col w-full gap-5">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('welcome')}</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<TeamsDailyActivityDisplayer className="shadow-none dark:bg-zinc-950" />
				<TeamsWeeklyActivityDisplayer className="shadow-none dark:bg-zinc-950" />
				<TeamsWorkedProjectDisplayer className="shadow-none dark:bg-zinc-950" />
				<TeamsDailyWorkedTimeDisplayer className="shadow-none dark:bg-zinc-950" />
				<TeamsWeeklyWorkedTimeDisplayer className="shadow-none dark:bg-zinc-950" />
			</div>

			{/* @ts-ignore */}
			<div className="flex gap-4">
				<TeamsModernTimer expandable showProgress className=" shadow-none dark:bg-zinc-950 border h-fit" />
				<TeamsChart
					type="line"
					className="w-full border p-5 rounded-xl shadow-none dark:border-gray-700 dark:bg-zinc-950 min-h-[200px]"
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				<TeamsTasksList className="border shadow-none h-fit dark:bg-zinc-950 dark:border-gray-700" />
				<TeamsProjectsList className="border shadow-none h-fit dark:bg-zinc-950 dark:border-gray-700" />
				<TeamsAppsUrlList className="border shadow-none h-fit dark:bg-zinc-950 dark:border-gray-700" />
			</div>
		</section>
	);
}
