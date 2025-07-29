import { Transition } from '@headlessui/react';
import React from 'react';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { useTranslations } from 'next-intl';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';
import { AppsTab } from '@/core/components/pages/profile/apps';
import { VisitedSitesTab } from '@/core/components/pages/profile/visited-sites';
import { LazyUserWorkedTaskTab } from '@/core/components/optimized-components';
import { ScreenshootTeamTab } from '../pages/profile/screenshots/screenshoots';
import { HorizontalSeparator } from '../duplicated-components/separator';
import { ProgressBar } from '../duplicated-components/_progress-bar';

const UserTeamActivity = ({ showActivity, member }: { showActivity: boolean; member?: any }) => {
	const { timeSlots } = useTimeSlots(true);
	const t = useTranslations();

	const activityPercent = timeSlots.reduce((acc, el) => acc + (el.percentage || 0), 0) / timeSlots.length;

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
			<div className="flex flex-col gap-y-4 justify-center w-full transition-all">
				<HorizontalSeparator className="my-4" />
				<h2 className="py-2 text-xl font-semibold">Activity for Today</h2>
				<div className="flex overflow-hidden flex-col gap-y-5 justify-between w-full">
					<div className="flex gap-3 items-center w-full">
						<div className="shadow basis-1/4 min-w-56 max-w-80 rounded-md p-4 h-32 bg-light--theme-light dark:bg-[#26272C]">
							<span>{t('timer.TIME_ACTIVITY')}</span>
							<h2 className="my-3 text-3xl font-bold">
								{activityPercent ? activityPercent.toFixed(2) : '00'} %
							</h2>
							<ProgressBar width={'80%'} progress={`${activityPercent}%`} className="my-2" />
						</div>
					</div>
					<div className="overflow-hidden flex-1 w-full">
						<Tab.Group>
							<Tab.List className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] gap-2 p-2">
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
							<Tab.Panels className="mt-2 w-full">
								<Tab.Panel className="overflow-hidden w-full">
									<LazyUserWorkedTaskTab member={member} />
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
			</div>
		</Transition>
	);
};

export default React.memo(UserTeamActivity);
