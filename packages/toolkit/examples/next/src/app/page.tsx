'use client';

import {
	TeamsLoginDialog,
	TeamsProjectsList,
	TeamsRegistrationForm,
	TeamsThemeToggle,
	TeamsDailyActivityDisplayer,
	useTeamsContext,
	TeamsWeeklyActivityDisplayer,
	TeamsWorkedProjectDisplayer,
	TeamsTasksList,
	TeamsAppsUrlList,
	TeamsModernTimer,
	TeamsDailyWorkedTimeDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsTrackingFilter,
	TeamsTrackingSessionInsight,
	TeamsTrackingClickInsight,
	TeamsTrackingHeatmap,
	TeamsTrackingSessionReplay,
	TeamsBasicReport,
	TeamsPomodoroTimer,
	TeamsTimesheet,
	TeamsReportDatesRangePicker,
	TeamsManualTimeForm
} from '@ever-teams/atoms';
import { Button, Dialog, ThemedButton } from '@ever-teams/toolkit-ui';
import { Suspense } from 'react';

export default function Home() {
	const { authenticatedUser: user } = useTeamsContext();

	return (
		<div className="p-8">
			<div className="my-20 flex flex-col gap-6 text-xl items-center ">
				<h1 className=" font-bold text-center text-6xl tracking-tighter">Teams NextJs Boilerplate</h1>
				<p className="text-center text-[#777777] dark:text-gray-400">
					Discover Teams NextJs Boilerplate and themes to jumpstart your application or website build.
				</p>

				<TeamsThemeToggle />
				<TeamsReportDatesRangePicker
					label="Select report dates"
					className="bg-white dark:bg-black p-4 rounded-md"
				/>

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
									Register Now
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
									className="relative min-w-40 hover:scale-105 transition-all "
								>
									Login
								</Button>
							}
						/>
					</div>
				)}
			</div>
			<div className="flex m-5 box-border gap-2 flex-wrap  justify-center sm:items-start">
				<TeamsManualTimeForm className="max-w-[300px]" />
				<TeamsModernTimer expandable={true} showProgress={true} />
				<TeamsBasicReport type="bar-horizontal" className=" shadow-none" />
				<TeamsBasicReport type="bar" className=" shadow-none" />
				<TeamsBasicReport type="area" className=" shadow-none" />
				<TeamsBasicReport type="line" className=" shadow-none" />
				<TeamsBasicReport type="pie" className=" shadow-none" />
				<TeamsBasicReport type="radar" className=" shadow-none" />
				<TeamsBasicReport type="radial" className=" shadow-none" />
				<TeamsBasicReport type="tooltip" className=" shadow-none" />
				<Suspense fallback={<div>Loading...</div>}>
					<TeamsModernTimer expandable showProgress />
				</Suspense>
				<TeamsProjectsList />
				<TeamsTasksList />
				<TeamsAppsUrlList />
				<TeamsTrackingFilter className="w-3/4" />
				<TeamsTrackingClickInsight />
				<TeamsTrackingSessionInsight />
				<TeamsTrackingHeatmap />
				<TeamsTrackingSessionReplay />
				<TeamsPomodoroTimer />
				<TeamsTimesheet />
			</div>
		</div>
	);
}
