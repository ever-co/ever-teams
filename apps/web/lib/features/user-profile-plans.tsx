'use client';

import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useCanSeeActivityScreen, useDailyPlan, useUserProfilePage } from '@app/hooks';
import { TaskCard } from './task/task-card';
import { IDailyPlan } from '@app/interfaces';
import { Container, NoData, ProgressBar, VerticalSeparator } from 'lib/components';
import { clsxm } from '@app/utils';
import { fullWidthState } from '@app/stores/fullWidth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { formatDayPlanDate, formatIntegerToHour } from '@app/helpers';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { ReaderIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Outstanding, PastTasks } from './task/daily-plan';
import { FutureTasks } from './task/daily-plan/future-tasks';
import { Button } from '@components/ui/button';

type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function UserProfilePlans() {
	const profile = useUserProfilePage();
	const { profileDailyPlans } = useDailyPlan();
	const fullWidth = useRecoilValue(fullWidthState);

	const [currentTab, setCurrentTab] = useState<FilterTabs>('Today Tasks');

	const tabsScreens = {
		'Today Tasks': <AllPlans plans={profileDailyPlans?.items} profile={profile} currentTab={currentTab} />,
		'Future Tasks': <FutureTasks dayPlans={profileDailyPlans?.items} profile={profile} />,
		'Past Tasks': <PastTasks dayPlans={profileDailyPlans?.items} profile={profile} />,
		'All Tasks': <AllPlans plans={profileDailyPlans?.items} profile={profile} />,
		Outstanding: <Outstanding dayPlans={profileDailyPlans?.items} profile={profile} />
	};

	return (
		<div className="">
			<Container fullWidth={fullWidth} className="pb-8 mb-5">
				<>
					{profileDailyPlans?.items?.length > 0 ? (
						<div>
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
						</div>
					) : (
						<EmptyPlans />
					)}
				</>
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
	// Filter plans
	let filteredPlans: IDailyPlan[] = [];

	filteredPlans = [...plans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	if (currentTab === 'Today Tasks')
		filteredPlans = [...plans].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);

	const { deleteDailyPlan, deleteDailyPlanLoading } = useDailyPlan();

	const canSeeActivity = useCanSeeActivityScreen();

	return (
		<div className="flex flex-col gap-6">
			{filteredPlans.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={
						currentTab === 'Today Tasks'
							? [new Date().toISOString().split('T')[0]]
							: [filteredPlans.map((plan) => new Date(plan.date).toISOString().split('T')[0])[0]]
					}
				>
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
								{/* Plan header */}
								<PlanHeader plan={plan} planMode={currentTab} />

								{/* Plan tasks list */}
								<ul className="flex flex-col gap-2 pb-[1.5rem]">
									{plan.tasks?.map((task) => (
										<TaskCard
											key={`${task.id}${plan.id}`}
											isAuthUser={true}
											activeAuthTask={true}
											viewType={'dailyplan'}
											task={task}
											profile={profile}
											type="HORIZONTAL"
											taskBadgeClassName={`rounded-sm`}
											taskTitleClassName="mt-[0.0625rem]"
											planMode={currentTab === 'Today Tasks' ? 'Today Tasks' : undefined}
											plan={plan}
										/>
									))}
								</ul>

								{/* Delete Plan */}
								{currentTab === 'Today Tasks' && (
									<>
										{canSeeActivity ? (
											<div className="flex justify-end">
												<Button
													disabled={deleteDailyPlanLoading}
													onClick={() => deleteDailyPlan(plan.id ?? '')}
													variant="destructive"
													className="p-7 py-6 font-normal rounded-xl text-md"
												>
													{deleteDailyPlanLoading && (
														<ReloadIcon className="animate-spin mr-2 h-4 w-4" />
													)}
													Delete this plan
												</Button>
											</div>
										) : (
											<></>
										)}
									</>
								)}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			) : (
				<EmptyPlans planMode={currentTab} />
			)}
		</div>
	);
}

export function PlanHeader({ plan, planMode }: { plan: IDailyPlan; planMode: FilterTabs }) {
	const [editTime, setEditTime] = useState<boolean>(false);
	const [time, setTime] = useState<number>(0);

	const { updateDailyPlan, updateDailyPlanLoading } = useDailyPlan();

	// Get all tasks's estimations time
	const times =
		plan.tasks?.map((task) => task.estimate).filter((time): time is number => typeof time === 'number') ?? [];
	let estimatedTime = 0;
	if (times.length > 0) estimatedTime = times.reduce((acc, cur) => acc + cur, 0) ?? 0;

	// Get all tasks's worked time
	const workedTimes =
		plan.tasks?.map((task) => task.totalWorkedTime).filter((time): time is number => typeof time === 'number') ??
		[];
	let totalWorkTime = 0;
	if (workedTimes.length > 0) totalWorkTime = workedTimes.reduce((acc, cur) => acc + cur, 0) ?? 0;

	// Get completed tasks from a plan
	const completedTasks = plan.tasks?.filter((task) => task.status === 'completed' && task.status).length ?? 0;

	// Get ready tasks from a plan
	const readyTasks = plan.tasks?.filter((task) => task.status === 'ready').length ?? 0;

	// Total tasks for plan
	const totalTasks = plan.tasks?.length ?? 0;

	// Completion percent
	const completionPercent = ((completedTasks * 100) / totalTasks).toFixed(2);

	return (
		<div
			className={`mb-8 flex ${planMode === 'Future Tasks' ? 'justify-start' : 'justify-around'}  items-center gap-5`}
		>
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
										updateDailyPlan({ workTimePlanned: time }, plan.id ?? '');
										setEditTime(false);
									}}
								/>
							)}
						</span>
					</div>
				)}
			</div>

			{/* Total estimated time  based on tasks */}
			<VerticalSeparator className="h-10" />

			<div className="flex items-center gap-2">
				<span className="font-medium">Estimated time: </span>
				<span className="font-semibold">{formatIntegerToHour(estimatedTime / 3600)}</span>
			</div>

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/* Total worked time for the plan */}
			{planMode !== 'Future Tasks' && (
				<div className="flex items-center gap-2">
					<span className="font-medium">Total time worked: </span>
					<span className="font-semibold">{formatIntegerToHour(totalWorkTime / 3600)}</span>
				</div>
			)}

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/*  Completed tasks */}
			{planMode !== 'Future Tasks' && (
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
						<span className="font-semibold">{totalTasks - completedTasks - readyTasks}</span>
					</div>
				</div>
			)}

			<VerticalSeparator />

			{/*  Completion progress */}
			{planMode !== 'Future Tasks' && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<span className="font-medium">Completion: </span>
						<span className="font-semibold">{completionPercent}%</span>
					</div>
					<ProgressBar progress={`${completionPercent || 0}%`} showPercents={false} width="100%" />
				</div>
			)}

			{/* Future tasks total plan */}
			{planMode === 'Future Tasks' && (
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">Planned tasks: </span>
						<span className="font-semibold">{totalTasks}</span>
					</div>
				</div>
			)}
		</div>
	);
}

export function EmptyPlans({ planMode }: { planMode?: FilterTabs }) {
	return (
		<div className="xl:mt-20">
			<NoData
				text={`No task planned ${planMode === 'Today Tasks' ? 'today' : ''}`}
				component={<ReaderIcon className="w-14 h-14" />}
			/>
		</div>
	);
}
