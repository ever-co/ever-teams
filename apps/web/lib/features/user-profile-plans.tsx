'use client';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { useAtom, useAtomValue } from 'jotai';
import { AlertPopup, Container, HorizontalSeparator, NoData, ProgressBar, VerticalSeparator } from 'lib/components';
import { checkPastDate } from 'lib/utils';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';
import { IoCalendarOutline } from 'react-icons/io5';

import { formatDayPlanDate, formatIntegerToHour } from '@app/helpers';
import { handleDragAndDrop } from '@app/helpers/drag-and-drop';
import {
	useAuthenticateUser,
	useCanSeeActivityScreen,
	useDailyPlan,
	useTeamTasks,
	useTimer,
	useUserProfilePage
} from '@app/hooks';
import { useDateRange } from '@app/hooks/useDateRange';
import { filterDailyPlan } from '@app/hooks/useFilterDateRange';
import { useLocalStorageState } from '@app/hooks/useLocalStorageState';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL,
	HAS_VISITED_OUTSTANDING_TASKS
} from '@app/constants';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { dataDailyPlanState } from '@app/stores';
import { fullWidthState } from '@app/stores/fullWidth';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import { clsxm } from '@app/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { Button } from '@components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { ReaderIcon, ReloadIcon, StarIcon } from '@radix-ui/react-icons';

import {
	estimatedTotalTime,
	getTotalTasks,
	Outstanding,
	OutstandingAll,
	OutstandingFilterDate,
	PastTasks
} from './task/daily-plan';
import { FutureTasks } from './task/daily-plan/future-tasks';
import ViewsHeaderTabs from './task/daily-plan/views-header-tabs';
import TaskBlockCard from './task/task-block-card';
import { TaskCard } from './task/task-card';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import DailyPlanTasksTableView from './task/daily-plan/table-view';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';
type FilterOutstanding = 'ALL' | 'DATE';

export function UserProfilePlans() {
	const t = useTranslations();

	const profile = useUserProfilePage();
	const {
		todayPlan,
		futurePlans,
		pastPlans,
		outstandingPlans,
		sortedPlans,
		profileDailyPlans,
		deleteDailyPlan,
		deleteDailyPlanLoading
	} = useDailyPlan();
	const fullWidth = useAtomValue(fullWidthState);
	const [currentOutstanding, setCurrentOutstanding] = useLocalStorageState<FilterOutstanding>('outstanding', 'ALL');
	const [currentTab, setCurrentTab] = useLocalStorageState<FilterTabs>('daily-plan-tab', 'Today Tasks');
	const [currentDataDailyPlan, setCurrentDataDailyPlan] = useAtom(dataDailyPlanState);
	const { setDate, date } = useDateRange(currentTab);

	const screenOutstanding = {
		ALL: <OutstandingAll profile={profile} />,
		DATE: <OutstandingFilterDate profile={profile} />
	};
	const tabsScreens = {
		'Today Tasks': <AllPlans profile={profile} currentTab={currentTab} />,
		'Future Tasks': <FutureTasks profile={profile} />,
		'Past Tasks': <PastTasks profile={profile} />,
		'All Tasks': <AllPlans profile={profile} />,
		Outstanding: <Outstanding filter={screenOutstanding[currentOutstanding]} />
	};
	const [filterFuturePlanData, setFilterFuturePlanData] = useState<IDailyPlan[]>(futurePlans);
	const [filterPastPlanData, setFilteredPastPlanData] = useState<IDailyPlan[]>(pastPlans);
	const [filterAllPlanData, setFilterAllPlanData] = useState<IDailyPlan[]>(sortedPlans);
	const dailyPlanSuggestionModalDate = window && window?.localStorage.getItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
	const path = usePathname();
	const haveSeenDailyPlanSuggestionModal = window?.localStorage.getItem(HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL);
	const { hasPlan } = useTimer();
	const { activeTeam } = useTeamTasks();
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const [popupOpen, setPopupOpen] = useState(false);
	const canSeeActivity = useCanSeeActivityScreen();

	// Set the tab plan tab to outstanding if user has no daily plan and there are outstanding tasks (on first load)
	useEffect(() => {
		if (dailyPlanSuggestionModalDate != new Date().toISOString().split('T')[0] && path.split('/')[1] == 'profile') {
			if (estimatedTotalTime(outstandingPlans).totalTasks) {
				setCurrentTab('Outstanding');
			}
			if (haveSeenDailyPlanSuggestionModal == new Date().toISOString().split('T')[0]) {
				if (!requirePlan || (requirePlan && hasPlan)) {
					window.localStorage.setItem(
						DAILY_PLAN_SUGGESTION_MODAL_DATE,
						new Date().toISOString().split('T')[0]
					);
				}
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		window.localStorage.setItem('daily-plan-tab', currentTab);
		if (!currentDataDailyPlan) return;
		if (currentTab === 'All Tasks') {
			setCurrentDataDailyPlan(sortedPlans);
			setFilterAllPlanData(filterDailyPlan(date as any, sortedPlans));
		} else if (currentTab === 'Past Tasks') {
			setCurrentDataDailyPlan(pastPlans);
			setFilteredPastPlanData(filterDailyPlan(date as any, pastPlans));
		} else if (currentTab === 'Future Tasks') {
			setCurrentDataDailyPlan(futurePlans);
			setFilterFuturePlanData(filterDailyPlan(date as any, futurePlans));
		} else if (currentTab === 'Outstanding') {
			window.localStorage.setItem(
				HAS_VISITED_OUTSTANDING_TASKS,
				new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]
			);
		}
	}, [currentTab, setCurrentDataDailyPlan, date, currentDataDailyPlan, futurePlans, pastPlans, sortedPlans]);

	return (
		<div ref={profile.loadTaskStatsIObserverRef}>
			<Container fullWidth={fullWidth} className="">
				<>
					{profileDailyPlans?.items?.length > 0 ? (
						<div className="space-y-4 ">
							<div className="flex items-center justify-between w-full min-w-fit max-w-[78svw]">
								<div className={clsxm('flex items-center gap-4')}>
									{Object.keys(tabsScreens).map((filter, i) => (
										<div key={i} className="flex items-center justify-start gap-4 cursor-pointer">
											{i !== 0 && <VerticalSeparator className="border-slate-400" />}
											<div
												className={clsxm(
													'text-gray-500 flex gap-2 items-center',
													currentTab == filter && 'text-blue-600 dark:text-white font-medium'
												)}
												onClick={() => {
													setDate(undefined);
													setCurrentTab(filter as FilterTabs);
												}}
											>
												{t(
													`task.tabFilter.${filter
														.toUpperCase()
														.replace(' ', '_')}` as DottedLanguageObjectStringPaths
												)}
												<span
													className={clsxm(
														'text-xs bg-gray-200 dark:bg-dark--theme-light text-dark--theme-light dark:text-gray-200 p-2 rounded py-1',
														currentTab == filter && 'dark:bg-gray-600'
													)}
												>
													{filter === 'Today Tasks' && getTotalTasks(todayPlan)}
													{filter === 'Future Tasks' && getTotalTasks(filterFuturePlanData)}
													{filter === 'Past Tasks' && getTotalTasks(filterPastPlanData)}
													{filter === 'All Tasks' && getTotalTasks(filterAllPlanData)}
													{filter === 'Outstanding' &&
														estimatedTotalTime(
															outstandingPlans.map((plan) =>
																plan.tasks?.map((task) => task)
															)
														).totalTasks}
												</span>
											</div>
										</div>
									))}
								</div>
								<div className="flex items-center gap-2">
									{currentTab === 'Today Tasks' && todayPlan[0] && (
										<>
											{canSeeActivity ? (
												<div className="flex justify-end">
													<AlertPopup
														open={popupOpen}
														buttonOpen={
															//button open popup
															<Button
																onClick={() => {
																	setPopupOpen((prev) => !prev);
																}}
																variant="outline"
																className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
															>
																{t('common.plan.DELETE_THIS_PLAN')}
															</Button>
														}
													>
														{/*button confirm*/}
														<Button
															disabled={deleteDailyPlanLoading}
															onClick={async () => {
																try {
																	if (requirePlan) {
																		localStorage.removeItem(
																			DAILY_PLAN_SUGGESTION_MODAL_DATE
																		);
																	}
																	todayPlan[0].id &&
																		(await deleteDailyPlan(todayPlan[0].id));
																} catch (error) {
																	console.error(error);
																} finally {
																	setPopupOpen(false);
																}
															}}
															variant="destructive"
															className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
														>
															{deleteDailyPlanLoading && (
																<ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
															)}
															{t('common.DELETE')}
														</Button>
														{/*button cancel*/}
														<Button
															onClick={() => setPopupOpen(false)}
															variant="outline"
															className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
														>
															{t('common.CANCEL')}
														</Button>
													</AlertPopup>
												</div>
											) : (
												<></>
											)}
										</>
									)}
									{currentTab === 'Outstanding' && (
										<Select
											onValueChange={(value) => {
												setCurrentOutstanding(value as FilterOutstanding);
											}}
										>
											<SelectTrigger className="w-[120px] h-9 dark:border-dark--theme-light dark:bg-dark-high">
												<SelectValue placeholder="Filter" />
											</SelectTrigger>
											<SelectContent className="border-none cursor-pointer dark:bg-dark--theme-light dark:border-dark--theme-light">
												{Object.keys(screenOutstanding).map((item, index) => (
													<SelectItem key={index} value={item}>
														<div className="flex items-center space-x-1">
															{item == 'DATE' ? <IoCalendarOutline /> : <StarIcon />}
															<span className="capitalize">{item}</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
									<ViewsHeaderTabs />
								</div>
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
/**
 *
 *
 * @param {{ profile: any; currentTab?: FilterTabs }} { profile, currentTab = 'All Tasks' }
 * @return {*}
 */
function AllPlans({ profile, currentTab = 'All Tasks' }: { profile: any; currentTab?: FilterTabs }) {
	// Filter plans
	const filteredPlans = useRef<IDailyPlan[]>([]);
	const { sortedPlans, todayPlan } = useDailyPlan();
	const { date } = useDateRange(currentTab);

	if (currentTab === 'Today Tasks') {
		filteredPlans.current = todayPlan;
	} else {
		filteredPlans.current = sortedPlans;
	}

	const view = useAtomValue(dailyPlanViewHeaderTabs);

	const [plans, setPlans] = useState(filteredPlans.current);

	useEffect(() => {
		setPlans(filterDailyPlan(date as any, filteredPlans.current));
	}, [date, todayPlan]);

	return (
		<div className="flex flex-col gap-6">
			{Array.isArray(plans) && plans?.length > 0 ? (
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, plans, setPlans)}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={
							currentTab === 'Today Tasks'
								? [new Date().toISOString().split('T')[0]]
								: [plans?.map((plan) => new Date(plan.date).toISOString().split('T')[0])[0]]
						}
					>
						{plans.map((plan) => (
							<AccordionItem
								value={plan.date.toString().split('T')[0]}
								key={plan.id}
								className="dark:border-slate-600 !border-none"
							>
								<AccordionTrigger className="!min-w-full text-start hover:no-underline">
									<div className="flex items-center justify-between w-full gap-3">
										<div className="text-lg min-w-max">
											{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
										</div>
										<HorizontalSeparator />
									</div>
								</AccordionTrigger>
								<AccordionContent className="bg-transparent border-none dark:bg-dark--theme">
									<PlanHeader plan={plan} planMode={currentTab as any} />

									{view === 'TABLE' ? (
										<DailyPlanTasksTableView
											profile={profile}
											plan={plan}
											data={plan.tasks ?? []}
										/>
									) : (
										<Droppable
											droppableId={plan.id as string}
											key={plan.id}
											type="task"
											direction={view === 'CARDS' ? 'vertical' : 'horizontal'}
										>
											{(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
												<ul
													ref={provided.innerRef}
													{...provided.droppableProps}
													className={clsxm(
														'flex-wrap',
														view === 'CARDS' && 'flex-col',
														'flex gap-2 pb-[1.5rem] flex-wrap',
														view === 'BLOCKS' && 'overflow-x-auto',
														snapshot.isDraggingOver ? 'lightblue' : '#F7F7F8'
													)}
												>
													{plan.tasks?.map((task, index) =>
														view === 'CARDS' ? (
															<Draggable
																key={task.id}
																draggableId={task.id}
																index={index}
															>
																{(provided) => (
																	<div
																		ref={provided.innerRef}
																		{...provided.draggableProps}
																		{...provided.dragHandleProps}
																		style={{
																			...provided.draggableProps.style,
																			marginBottom: 6
																		}}
																	>
																		<TaskCard
																			isAuthUser={true}
																			activeAuthTask={true}
																			viewType={'dailyplan'}
																			task={task}
																			profile={profile}
																			type="HORIZONTAL"
																			taskBadgeClassName={`rounded-sm`}
																			taskTitleClassName="mt-[0.0625rem]"
																			planMode={
																				currentTab === 'Today Tasks'
																					? 'Today Tasks'
																					: undefined
																			}
																			plan={plan}
																			className="shadow-[0px_0px_15px_0px_#e2e8f0]"
																		/>
																	</div>
																)}
															</Draggable>
														) : (
															<Draggable
																key={task.id}
																draggableId={task.id}
																index={index}
															>
																{(provided) => (
																	<div
																		ref={provided.innerRef}
																		{...provided.draggableProps}
																		{...provided.dragHandleProps}
																		style={{
																			...provided.draggableProps.style,
																			marginBottom: 8
																		}}
																	>
																		<TaskBlockCard task={task} />
																	</div>
																)}
															</Draggable>
														)
													)}
													{provided.placeholder as React.ReactElement}
												</ul>
											)}
										</Droppable>
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</DragDropContext>
			) : (
				<EmptyPlans planMode="Past Tasks" />
			)}
		</div>
	);
}

export function PlanHeader({ plan, planMode }: { plan: IDailyPlan; planMode: FilterTabs }) {
	const [editTime, setEditTime] = useState<boolean>(false);
	const [time, setTime] = useState<number>(0);
	const { updateDailyPlan, updateDailyPlanLoading } = useDailyPlan();
	const { isTeamManager } = useAuthenticateUser();
	const t = useTranslations();
	// Get all tasks's estimations time
	// Helper function to sum times
	const sumTimes = useCallback((tasks: ITeamTask[], key: any) => {
		return (
			tasks
				?.map((task: any) => task[key])
				.filter((time): time is number => typeof time === 'number')
				.reduce((acc, cur) => acc + cur, 0) ?? 0
		);
	}, []);

	// Get all tasks' estimation and worked times
	const estimatedTime = useMemo(() => (plan.tasks ? sumTimes(plan.tasks, 'estimate') : 0), [plan.tasks]);
	const totalWorkTime = useMemo(() => (plan.tasks ? sumTimes(plan.tasks, 'totalWorkedTime') : 0), [plan.tasks]);

	// Get completed and ready tasks from a plan
	const completedTasks = useMemo(
		() => plan.tasks?.filter((task) => task.status === 'completed').length ?? 0,
		[plan.tasks]
	);

	const readyTasks = useMemo(() => plan.tasks?.filter((task) => task.status === 'ready').length ?? 0, [plan.tasks]);

	// Total tasks for the plan
	const totalTasks = plan.tasks?.length ?? 0;

	// Completion percent
	const completionPercent = totalTasks > 0 ? ((completedTasks * 100) / totalTasks).toFixed(0) : '0.0';

	return (
		<div
			className={`mb-6 flex ${
				planMode === 'Future Tasks' ? 'justify-start' : 'justify-around'
			}  items-center gap-5`}
		>
			{/* Planned Time */}

			<div className="flex items-center gap-2">
				{!editTime && !updateDailyPlanLoading ? (
					<>
						<div>
							<span className="font-medium">{t('dailyPlan.PLANNED_TIME')} : </span>
							<span className="font-semibold">{formatIntegerToHour(plan.workTimePlanned)}</span>
						</div>
						{(!checkPastDate(plan.date) || isTeamManager) && (
							<EditPenBoxIcon
								className={clsxm('cursor-pointer lg:h-4 lg:w-4 w-2 h-2', 'dark:stroke-[#B1AEBC]')}
								onClick={() => setEditTime(true)}
							/>
						)}
					</>
				) : (
					<div className="flex">
						<input
							min={0}
							type="number"
							className={clsxm(
								'outline-none p-0 bg-transparent border-b text-center max-w-[54px] text-xs font-medium'
							)}
							onChange={(e) => setTime(parseFloat(e.target.value))}
						/>
						<span>
							{updateDailyPlanLoading ? (
								<ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
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
				<span className="font-medium">{t('dailyPlan.ESTIMATED_TIME')} : </span>
				<span className="font-semibold">{formatIntegerToHour(estimatedTime / 3600)}</span>
			</div>

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/* Total worked time for the plan */}
			{planMode !== 'Future Tasks' && (
				<div className="flex items-center gap-2">
					<span className="font-medium">{t('dailyPlan.TOTAL_TIME_WORKED')} : </span>
					<span className="font-semibold">{formatIntegerToHour(totalWorkTime / 3600)}</span>
				</div>
			)}

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/*  Completed tasks */}
			{planMode !== 'Future Tasks' && (
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{t('dailyPlan.COMPLETED_TASKS')} : </span>
						<span className="font-medium">{`${completedTasks}/${totalTasks}`}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{t('dailyPlan.READY')}: </span>
						<span className="font-medium">{readyTasks}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{t('dailyPlan.LEFT')}: </span>
						<span className="font-semibold">{totalTasks - completedTasks - readyTasks}</span>
					</div>
				</div>
			)}

			<VerticalSeparator />

			{/*  Completion progress */}
			{planMode !== 'Future Tasks' && (
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<span className="font-medium">{t('dailyPlan.COMPLETION')}: </span>
						<span className="font-semibold">{completionPercent}%</span>
					</div>
					<ProgressBar progress={`${completionPercent || 0}%`} showPercents={false} width="100%" />
				</div>
			)}

			{/* Future tasks total plan */}
			{planMode === 'Future Tasks' && (
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{t('dailyPlan.PLANNED_TASKS')}: </span>
						<span className="font-semibold">{totalTasks}</span>
					</div>
				</div>
			)}
		</div>
	);
}

export function EmptyPlans({ planMode }: Readonly<{ planMode?: FilterTabs }>) {
	const t = useTranslations();

	return (
		<div className="xl:mt-20">
			<NoData
				text={planMode == 'Today Tasks' ? t('dailyPlan.NO_TASK_PLANNED_TODAY') : t('dailyPlan.NO_TASK_PLANNED')}
				component={<ReaderIcon className="w-14 h-14" />}
			/>
		</div>
	);
}
