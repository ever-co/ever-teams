import { Transition } from '@headlessui/react';
import { HorizontalSeparator, ProgressBar } from '@/core/components';
import React from 'react';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { useTranslations } from 'next-intl';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';
import { ScreenshootTeamTab } from '@/core/components/activities/screenshoots';
import { AppsTab } from '@/core/components/activities/apps';
import { VisitedSitesTab } from '@/core/components/activities/visited-sites';
import { OT_Member } from '@/core/types/interfaces';
import UserWorkedTaskTab from '@/core/components/activities/user-worked-task';

const UserTeamActivity = ({ showActivity, member }: { showActivity: boolean; member?: OT_Member }) => {
	const { timeSlots } = useTimeSlots(true);
	const t = useTranslations();

	const activityPercent = timeSlots.reduce((acc, el) => acc + el.percentage, 0) / timeSlots.length;

	return (
		<Transition
			as="div"
			show={!!showActivity}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
			className="w-full"
		>
			<div className="flex flex-col justify-center w-full transition-all gap-y-4">
				<HorizontalSeparator className="my-4" />
				<h2 className="py-2 text-xl font-semibold">Activity for Today</h2>
				<div className="flex flex-col justify-between w-full overflow-hidden gap-y-5">
					<div className="flex items-center w-full gap-3">
						<div className="shadow basis-1/4 min-w-56 max-w-80 rounded-md p-4 h-32 bg-light--theme-light dark:bg-[#26272C]">
							<span>{t('timer.TIME_ACTIVITY')}</span>
							<h2 className="my-3 text-3xl font-bold">
								{activityPercent ? activityPercent.toFixed(2) : '00'} %
							</h2>
							<ProgressBar width={'80%'} progress={`${activityPercent}%`} className="my-2" />
						</div>
					</div>
					<div className="flex-1 w-full overflow-hidden">
						<Tab.Group>
							<Tab.List className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2">
								{Object.values(ActivityFilters).map((filter: string) => (
									<Tab
										key={filter}
										className={({ selected }) =>
											clsxm(
												'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
												'focus:outline-none focus:ring-2',
												selected
													? 'bg-white dark:bg-dark text-blue-700 shadow'
													: 'hover:bg-white/[0.50]'
											)
										}
									>
										{filter}
									</Tab>
								))}
							</Tab.List>
							<Tab.Panels className="w-full mt-2">
								<Tab.Panel className="w-full overflow-hidden">
									<UserWorkedTaskTab member={member} />
								</Tab.Panel>
								<Tab.Panel className="w-full">
									<ScreenshootTeamTab />
								</Tab.Panel>
								<Tab.Panel className="w-full">
									<AppsTab />
								</Tab.Panel>
								<Tab.Panel className="w-full">
									<VisitedSitesTab />
								</Tab.Panel>
							</Tab.Panels>
						</Tab.Group>
					</div>
				</div>
				<div className="flex-1 w-full overflow-hidden">
					<Tab.Group>
						<Tab.List className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2">
							{Object.values(ActivityFilters).map((filter: string) => (
								<Tab
									key={filter}
									className={({ selected }) =>
										clsxm(
											'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
											'focus:outline-none focus:ring-2',
											selected
												? 'bg-white dark:bg-dark text-blue-700 shadow'
												: 'hover:bg-white/[0.50]'
										)
									}
								>
									{filter}
								</Tab>
							))}
						</Tab.List>
						<Tab.Panels className="w-full mt-2">
							<Tab.Panel className="w-full overflow-hidden">
								<UserWorkedTaskTab member={member} />
							</Tab.Panel>
							<Tab.Panel className="w-full">
								<ScreenshootTeamTab />
							</Tab.Panel>
							<Tab.Panel className="w-full">
								<AppsTab />
							</Tab.Panel>
							<Tab.Panel className="w-full">
								<VisitedSitesTab />
							</Tab.Panel>
						</Tab.Panels>
					</Tab.Group>
				</div>
			</div>
		</Transition>
	);
};

export default React.memo(UserTeamActivity);
