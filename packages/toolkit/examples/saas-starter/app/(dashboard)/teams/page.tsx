'use client';

import HomeLayout from '@/components/layout/home-layout';
import {
	TeamsBasicReport,
	TeamsAppsUrlList,
	TeamsLoginDialog,
	TeamsProjectsList,
	TeamsRegistrationForm,
	TeamsTasksList,
	TeamsThemeToggle,
	TeamsDailyActivityDisplayer,
	TeamsDailyWorkedTimeDisplayer,
	TeamsModernTimer,
	useTeamsContext,
	TeamsWeeklyActivityDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsWorkedProjectDisplayer
} from '@ever-teams/atoms';
import { Button, Dialog, ThemedButton } from '@ever-teams/toolkit-ui';
import { useTranslations } from 'next-intl';
import { JSX, Suspense } from 'react';

function TeamsShowCase(): JSX.Element {
	const { authenticatedUser: user } = useTeamsContext();
	const t = useTranslations('Teams');

	return (
		<HomeLayout>
			<div className="my-20 flex flex-col gap-6 items-center ">
				<h1 className=" font-bold text-center text-7xl tracking-tighter">{t('title')}</h1>
				<p className="text-center text-[#777777] dark:text-gray-400">{t('description')}</p>
				<TeamsThemeToggle />
				<div className={'flex gap-3 items-center'}>
					<TeamsDailyWorkedTimeDisplayer />
					<TeamsWeeklyWorkedTimeDisplayer />
					<TeamsWeeklyActivityDisplayer />
					<TeamsDailyActivityDisplayer />
					<TeamsWorkedProjectDisplayer />
				</div>
				{!user && (
					<div className="flex gap-6">
						<Dialog
							trigger={
								<ThemedButton size={'lg'} className="min-w-40">
									{t('get_started')}
								</ThemedButton>
							}
						>
							<TeamsRegistrationForm />
						</Dialog>

						<TeamsLoginDialog
							trigger={
								<Button
									size={'lg'}
									variant={'outline'}
									className="relative min-w-40 hover:scale-105 transition-all"
								>
									Login
								</Button>
							}
						/>
					</div>
				)}
			</div>
			<div className="flex m-5 box-border gap-2 flex-wrap  justify-center sm:items-start">
				<TeamsModernTimer expandable={true} showProgress={true} />
				<TeamsBasicReport type="area" size={'default'} />
				<Suspense fallback={<div>Loading...</div>}>
					<TeamsModernTimer expandable showProgress />
				</Suspense>
				<TeamsProjectsList />
				<TeamsTasksList />
				<TeamsAppsUrlList />

				{/* This is a place where you can test component before putting them */}

				{/* atoms or any other package */}
			</div>
		</HomeLayout>
	);
}

export default TeamsShowCase;
