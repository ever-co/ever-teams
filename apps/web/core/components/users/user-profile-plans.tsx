'use client';
import { useAtom, useAtomValue } from 'jotai';
import { AlertPopup, Container } from '@/core/components';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useCanSeeActivityScreen, useDailyPlan, useTeamTasks, useTimer, useUserProfilePage } from '@/core/hooks';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { filterDailyPlan } from '@/core/hooks/daily-plans/use-filter-date-range';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL,
	HAS_VISITED_OUTSTANDING_TASKS
} from '@/core/constants/config/constants';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { dataDailyPlanState } from '@/core/stores';
import { fullWidthState } from '@/core/stores/common/full-width';
import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components/duplicated-components/_button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { ReloadIcon, StarIcon } from '@radix-ui/react-icons';

import {
	estimatedTotalTime,
	getTotalTasks,
	Outstanding,
	OutstandingAll,
	OutstandingFilterDate,
	PastTasks
} from '../tasks/daily-plan';
import { FutureTasks } from '../tasks/daily-plan/future-tasks';
import ViewsHeaderTabs from '../tasks/daily-plan/views-header-tabs';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { IconsCalendarMonthOutline } from '@/core/components/icons';
import { VerticalSeparator } from '../duplicated-components/separator';
import { AllPlans, EmptyPlans } from '@/core/components/daily-plan';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';
type FilterOutstanding = 'ALL' | 'DATE';

interface IUserProfilePlansProps {
	user?: TUser;
}

export function UserProfilePlans(props: IUserProfilePlansProps) {
	const t = useTranslations();

	const { user } = props;

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
		ALL: <OutstandingAll profile={profile} user={user} />,
		DATE: <OutstandingFilterDate profile={profile} user={user} />
	};
	const tabsScreens = {
		'Today Tasks': <AllPlans profile={profile} currentTab={currentTab} user={user} />,
		'Future Tasks': <FutureTasks profile={profile} user={user} />,
		'Past Tasks': <PastTasks profile={profile} user={user} />,
		'All Tasks': <AllPlans profile={profile} user={user} />,
		Outstanding: <Outstanding filter={screenOutstanding[currentOutstanding]} />
	};
	const [filterFuturePlanData, setFilterFuturePlanData] = useState<TDailyPlan[]>(futurePlans);
	const [filterPastPlanData, setFilteredPastPlanData] = useState<TDailyPlan[]>(pastPlans);
	const [filterAllPlanData, setFilterAllPlanData] = useState<TDailyPlan[]>(sortedPlans);
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

	// Memoize expensive computations to prevent unnecessary re-renders
	const filteredData = useMemo(() => {
		if (!currentDataDailyPlan) return null;

		switch (currentTab) {
			case 'All Tasks':
				return filterDailyPlan(date as any, sortedPlans);
			case 'Past Tasks':
				return filterDailyPlan(date as any, pastPlans);
			case 'Future Tasks':
				return filterDailyPlan(date as any, futurePlans);
			default:
				return null;
		}
	}, [currentTab, date, sortedPlans, pastPlans, futurePlans, currentDataDailyPlan]);

	// Handle tab changes with optimized effects
	useEffect(() => {
		if (!currentDataDailyPlan) return;

		switch (currentTab) {
			case 'All Tasks':
				setCurrentDataDailyPlan(sortedPlans);
				if (filteredData) setFilterAllPlanData(filteredData);
				break;
			case 'Past Tasks':
				setCurrentDataDailyPlan(pastPlans);
				if (filteredData) setFilteredPastPlanData(filteredData);
				break;
			case 'Future Tasks':
				setCurrentDataDailyPlan(futurePlans);
				if (filteredData) setFilterFuturePlanData(filteredData);
				break;
			case 'Outstanding':
				// Only update localStorage when necessary
				try {
					const today = new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0];
					const lastVisited = window?.localStorage.getItem(HAS_VISITED_OUTSTANDING_TASKS);
					if (lastVisited !== today) {
						window.localStorage.setItem(HAS_VISITED_OUTSTANDING_TASKS, today);
					}
				} catch (error) {
					console.error('Error updating outstanding tasks visit date:', error);
				}
				break;
		}
	}, [currentTab, filteredData, sortedPlans, pastPlans, futurePlans, currentDataDailyPlan, setCurrentDataDailyPlan]);
	const totalTasksDailyPlansMap = useMemo(() => {
		return {
			'Today Tasks': getTotalTasks(todayPlan, user),
			'Future Tasks': getTotalTasks(filterFuturePlanData, user),
			'Past Tasks': getTotalTasks(filterPastPlanData, user),
			'All Tasks': getTotalTasks(filterAllPlanData, user),
			Outstanding: estimatedTotalTime(
				outstandingPlans.map((plan) => {
					const tasks = plan.tasks ?? [];
					if (user) {
						return tasks.filter((task) => task.members?.some((member) => member.userId === user.id));
					}
					return tasks;
				})
			).totalTasks
		};
	}, [todayPlan, filterFuturePlanData, filterPastPlanData, filterAllPlanData, outstandingPlans, user]);
	return (
		<div ref={profile.loadTaskStatsIObserverRef}>
			<Container fullWidth={fullWidth} className="">
				<>
					{profileDailyPlans?.items?.length > 0 ? (
						<div className="space-y-4">
							<div className="flex items-center justify-between w-full min-w-fit max-w-[78svw]">
								<div className={clsxm('flex gap-4 items-center')}>
									{Object.keys(tabsScreens).map((filter, i) => (
										<div key={i} className="flex gap-4 justify-start items-center cursor-pointer">
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
													{totalTasksDailyPlansMap[filter as FilterTabs]}
												</span>
											</div>
										</div>
									))}
								</div>
								<div className="flex gap-2 items-center">
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
															className="flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
														>
															{deleteDailyPlanLoading && (
																<ReloadIcon className="mr-2 w-4 h-4 animate-spin" />
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
															{item == 'DATE' ? (
																<IconsCalendarMonthOutline className="w-4 h-4" />
															) : (
																<StarIcon className="w-4 h-4" />
															)}
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
