'use client';

import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useDailyPlan, useUserProfilePage } from '@app/hooks';
import { TaskCard } from './task/task-card';
import { IDailyPlan } from '@app/interfaces';
import { Container, VerticalSeparator } from 'lib/components';
import { clsxm } from '@app/utils';
import { fullWidthState } from '@app/stores/fullWidth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { formatDayPlanDate } from '@app/helpers';

type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function UserProfilePlans() {
	const profile = useUserProfilePage();
	const { dailyPlan } = useDailyPlan();
	const fullWidth = useRecoilValue(fullWidthState);

	const [currentTab, setCurrentTab] = useState<FilterTabs>('Today Tasks');

	const tabsScreens = {
		'Today Tasks': <AllPlans plans={dailyPlan.items} profile={profile} currentTab={currentTab} />,
		'Future Tasks': <AllPlans plans={dailyPlan.items} profile={profile} currentTab={currentTab} />,
		'Past Tasks': <AllPlans plans={dailyPlan.items} profile={profile} currentTab={currentTab} />,
		'All Tasks': <AllPlans plans={dailyPlan.items} profile={profile} />,
		Outstanding: <></>
	};

	return (
		<div className="">
			<Container fullWidth={fullWidth} className="pb-8 mb-5">
				<div className={clsxm('flex justify-start items-center gap-4 mt-14 mb-5')}>
					{Object.keys(tabsScreens).map((filter, i) => (
						<div key={i} className="flex cursor-pointer justify-start items-center gap-4">
							{i !== 0 && <VerticalSeparator className="border-slate-400" />}
							<div
								className={clsxm(
									'text-gray-500',
									currentTab == filter && 'text-blue-600 dark:text-white font-medium'
								)}
								onClick={() => setCurrentTab(filter as FilterTabs)}
							>
								{filter}
							</div>
						</div>
					))}
				</div>
				{tabsScreens[currentTab]}
			</Container>
		</div>
	);
}

function AllPlans({
	plans,
	profile,
	currentTab = 'All Tasks'
}: {
	plans: IDailyPlan[];
	profile: any;
	currentTab?: FilterTabs;
}) {
	// Sort plans
	const ascSortedPlans = [...plans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const descSortedPlans = [...plans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// Filter plans
	let filteredPlans: IDailyPlan[] = [];

	filteredPlans = [...plans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	if (currentTab === 'Future Tasks')
		filteredPlans = ascSortedPlans.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
			return planDate.getTime() >= today.getTime();
		});

	if (currentTab === 'Past Tasks')
		filteredPlans = descSortedPlans.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
			return planDate.getTime() < today.getTime();
		});

	if (currentTab === 'Today Tasks')
		filteredPlans = [...plans].filter((plan) =>
			plan.date.toString().startsWith(new Date().toISOString().split('T')[0])
		);

	return (
		<ul className="flex flex-col gap-6">
			<Accordion type="multiple" className="text-sm" defaultValue={[new Date().toISOString().split('T')[0]]}>
				{filteredPlans.map((plan) => (
					<AccordionItem
						value={plan.date.toString().split('T')[0]}
						key={plan.id}
						className="dark:border-slate-600"
					>
						<AccordionTrigger className="hover:no-underline">
							<div className="text-lg">
								{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
							</div>
						</AccordionTrigger>
						<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme">
							<ul className="flex flex-col gap-2">
								{plan.tasks?.map((task) => (
									<TaskCard
										key={`${task.id}${plan.id}`}
										isAuthUser={profile.isAuthUser}
										activeAuthTask={false}
										viewType={'dailyplan'}
										task={task}
										profile={profile}
										type="HORIZONTAL"
										taskBadgeClassName={`rounded-sm`}
										taskTitleClassName="mt-[0.0625rem]"
									/>
								))}
							</ul>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</ul>
	);
}
