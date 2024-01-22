import { Transition } from '@headlessui/react';
import { HorizontalSeparator, ProgressBar } from 'lib/components';
import React from 'react';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
import { useTranslations } from 'next-intl';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@app/constants';
import { clsxm } from '@app/utils';
import { ScreenshootTeamTab } from 'lib/features/activity/screenshoots';
import { AppsTab } from 'lib/features/activity/apps';
import { VisitedSitesTab } from 'lib/features/activity/visited-sites';
import { OT_Member } from '@app/interfaces';
import { UserWorkedTaskTab } from 'lib/features/activity/user-worked-task';
// import { UserProfileTask } from 'lib/features/user-profile-tasks';

const UserTeamActivity = ({
	showActivity,
	member
}: {
	showActivity: boolean;
	profile: any;
	hook: any;
	member?: OT_Member;
}) => {
	const { timeSlots } = useTimeSlots(true);

	const t = useTranslations();

	const activityPercent = timeSlots.reduce((acc, el) => acc + el.percentage, 0) / timeSlots.length;
	return (
		<Transition
			show={!!showActivity}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
		>
			<div className="">
				<HorizontalSeparator className="my-4" />
				<h2 className="text-xl font-semibold py-2 px-4">Activity for Today</h2>
				<div className="flex justify-between">
					<div className="w-56 ">
						<div className="shadow rounded-md w-full p-4 m-4 h-32 bg-light--theme-light dark:bg-[#26272C]">
							<span>{t('timer.TIME_ACTIVITY')}</span>
							<h2 className="text-3xl font-bold my-3">
								{activityPercent ? activityPercent.toFixed(2) : '00'} %
							</h2>
							<ProgressBar width={'80%'} progress={`${activityPercent}%`} className="my-2" />
						</div>
					</div>
					<div className="p-4 flex-1">
						<Tab.Group>
							<Tab.List className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2 mx-4">
								{Object.values(ActivityFilters).map((filter: string) => (
									<Tab
										key={filter}
										className={({ selected }) =>
											clsxm(
												'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
												' focus:outline-none focus:ring-2',
												selected
													? 'bg-white dark:bg-dark text-blue-700 shadow'
													: ' hover:bg-white/[0.50]'
											)
										}
									>
										{filter}
									</Tab>
								))}
							</Tab.List>
							<Tab.Panels>
								<Tab.Panel className="w-full mx-4 p-2">
									<UserWorkedTaskTab member={member} />
								</Tab.Panel>
								<Tab.Panel className="w-full mx-4 p-2">
									<ScreenshootTeamTab />
								</Tab.Panel>
								<Tab.Panel className="w-full mx-4 p-2">
									<AppsTab />
								</Tab.Panel>
								<Tab.Panel className="w-full mx-4 p-2">
									<VisitedSitesTab />
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</div>
				</div>
			</div>
		</Transition>
	);
};

export default UserTeamActivity;
