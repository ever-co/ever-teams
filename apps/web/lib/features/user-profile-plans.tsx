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
import { formatDayPlanDate, formatIntegerToHour } from '@app/helpers';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { ReloadIcon } from '@radix-ui/react-icons';

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
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
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
						<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme z-[9999]">
							{/* Plan header */}
							<PlanHeader plan={plan} planMode={currentTab} />

							{/* Plan tasks list */}
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

function PlanHeader({ plan, planMode }: { plan: IDailyPlan; planMode: FilterTabs }) {
	const [editTime, setEditTime] = useState<boolean>(false);
	const [time, setTime] = useState<number>(0);

	const { updateDailyPlan, updateDailyPlanLoading } = useDailyPlan();

	// Get all tasks's estimations time
	const times = plan.tasks?.map((task) => task.estimate).filter((time) => typeof time === 'number');
	let estimatedTime = 0;
	if (times) estimatedTime = times.reduce((acc, cur) => acc + cur, 0);

	// Get all tasks's worked time
	const workedTimes = plan.tasks?.map((task) => task.totalWorkedTime).filter((time) => typeof time === 'number');
	let totalWorkTime = 0;
	if (workedTimes) totalWorkTime = workedTimes.reduce((acc, cur) => acc + cur, 0);

	// Get completed tasks from a plan
	const completedTasks = plan.tasks?.filter((task) => task.status === 'completed' && task.status).length ?? 0;

	// Get ready tasks from a plan
	const readyTasks = plan.tasks?.filter((task) => task.status === 'ready').length ?? 0;

	return (
		<div className="mb-8 flex justify-around items-center gap-5">
			{/* Planned Time */}

			<div className="flex items-center gap-2">
				{!editTime && !updateDailyPlanLoading ? (
					<>
						<div>
							<span className="font-medium">Planned time: </span>
							<span className="font-semibold">{formatIntegerToHour(plan.workTimePlanned)}</span>
						</div>
						{planMode !== 'Past Tasks' && (
							<EditPenBoxIcon
								className={clsxm('cursor-pointer lg:h-4 lg:w-4 w-2 h-2', 'dark:stroke-[#B1AEBC]')}
								onClick={() => setEditTime(true)}
							/>
						)}
					</>
				) : (
					<div className="flex">
						<input
							type="number"
							className={clsxm(
								'outline-none p-0 bg-transparent border-b text-center max-w-[54px] text-xs font-medium'
							)}
							onChange={(e) => setTime(parseFloat(e.target.value))}
						/>
						<span>
							{updateDailyPlanLoading ? (
								<ReloadIcon className="animate-spin mr-2 h-4 w-4" />
							) : (
								<TickSaveIcon
									className="w-5 cursor-pointer"
									onClick={() => {
										updateDailyPlan({ workTimePlanned: time }, plan.id);
										setEditTime(false);
									}}
								/>
							)}
						</span>
					</div>
				)}
			</div>

			{/* Total estomated time  based on tasks */}
			<VerticalSeparator />

			<div className="flex items-center gap-2">
				<span className="font-medium">Estimated time: </span>
				<span className="font-semibold">{formatIntegerToHour(estimatedTime / 3600)}</span>
			</div>

			<VerticalSeparator />

			{/* Total worked time for the plan */}
			<div className="flex items-center gap-2">
				<span className="font-medium">Total time worked: </span>
				<span className="font-semibold">{formatIntegerToHour(totalWorkTime / 3600)}</span>
			</div>

			<VerticalSeparator />

			{/*  Completed tasks */}
			<div>
				<div className="flex items-center gap-2">
					<span className="font-medium">Completed tasks: </span>
					<span className="font-medium">{completedTasks}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="font-medium">Ready: </span>
					<span className="font-medium">{readyTasks}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="font-medium">Left: </span>
					<span className="font-semibold">
						{plan.tasks?.length && plan.tasks.length - completedTasks - readyTasks}
					</span>
				</div>
			</div>

			<VerticalSeparator />

			{/*  Completion progress */}
			<div>
				<div className="flex items-center gap-2">
					<span className="font-medium">Completion: </span>
					{/* <span className="font-semibold">{estimatedTimeSum}</span> */}
				</div>
				{/* Tasks progress here */}
			</div>
		</div>
	);
}
