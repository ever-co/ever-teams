'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { AlertPopup } from '@/core/components';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCanSeeActivityScreen, useUserProfilePage } from '@/core/hooks';
import { useTimerPlanStatus } from '@/core/hooks/timer';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useDeleteDailyPlan } from '@/core/hooks/daily-plans/use-delete-daily-plan';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { filterDailyPlan, filterDailyPlansByTasks } from '@/core/hooks/daily-plans/use-filter-date-range';
import { estimatedTotalTime, getTotalTasks } from '@/core/hooks/daily-plans/daily-plan-totals';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL,
	HAS_VISITED_OUTSTANDING_TASKS
} from '@/core/constants/config/constants';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { activeTeamState, dailyPlanVisibleTabsState } from '@/core/stores';
import { allPlansModalState } from '@/core/stores/all-plans-modal';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner as ReloadIcon } from '@/core/components/icons';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { TaskCardSkeleton } from '@/core/components/common/skeleton/profile-component-skeletons';
import {
	TASK_GROUP_STACK,
	TASK_LIST_STACK,
	TASK_LIST_SURFACE,
	TASK_ROW_SKELETON_BAR
} from '@/core/components/tasks/task-row-recipes';
import { cn } from '@/core/lib/helpers';
import { isProfilePathname } from '@/core/lib/utils/profile-path';
import { logErrorInDev } from '@/core/lib/helpers/error-message';

import { OutstandingAll, OutstandingFilterDate, PastTasks } from '../tasks/daily-plan';
import { FutureTasks } from '../tasks/daily-plan/future-tasks';
import ViewsHeaderTabs from '../tasks/daily-plan/views-header-tabs';
import { DailyPlanFilter } from '../tasks/daily-plan/daily-plan-filter';
import { keepPickedPlans } from '../tasks/daily-plan/plan-picks';
import { TaskDatePickerWithRange } from '../tasks/task-date-range';
import { DateRange } from 'react-day-picker';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { AllPlans, EmptyPlans } from '@/core/components/daily-plan';
import { TTask } from '@/core/types/schemas/task/task.schema';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

type FilterOutstanding = 'ALL' | 'DATE';

const PLAN_VIEWS: FilterTabs[] = ['Today Tasks', 'Future Tasks', 'Past Tasks', 'All Tasks', 'Outstanding'];

const PLAN_VIEW_LABEL_KEYS: Record<FilterTabs, DottedLanguageObjectStringPaths> = {
	'Today Tasks': 'common.TODAY',
	'Future Tasks': 'profile.plans.FUTURE',
	'Past Tasks': 'profile.plans.PAST',
	'All Tasks': 'common.FILTER_ALL',
	Outstanding: 'task.tabFilter.OUTSTANDING'
};

const OUTSTANDING_GROUPINGS: FilterOutstanding[] = ['DATE', 'ALL'];

const OUTSTANDING_LABEL_KEYS: Record<FilterOutstanding, DottedLanguageObjectStringPaths> = {
	DATE: 'dashboard.weeklyLimit.GROUPING_PERIOD',
	ALL: 'common.FILTER_ALL'
};

const NO_PICKS: string[] = [];

const SKELETON_ROWS = [0, 1, 2];

/** The plan tabs that can be narrowed to a planned date range, with the plans their picker offers. */
function rangeTabPlansOf(
	tab: FilterTabs,
	plans: { future: TDailyPlan[]; past: TDailyPlan[]; all: TDailyPlan[] }
): TDailyPlan[] | null {
	if (tab === 'Future Tasks') {
		return plans.future;
	}
	if (tab === 'Past Tasks') {
		return plans.past;
	}
	if (tab === 'All Tasks') {
		return plans.all;
	}
	return null;
}

function narrowPlans(plans: TDailyPlan[], filteredTaskIds: string[] | undefined, pickedPlanIds: string[]) {
	const pickedPlans = keepPickedPlans(plans, pickedPlanIds);
	if (filteredTaskIds) {
		return filterDailyPlansByTasks(pickedPlans, filteredTaskIds);
	}
	return pickedPlans;
}

function tasksOfMember(tasks: TTask[], user: TUser | undefined) {
	if (!user) {
		return tasks;
	}
	return tasks.filter((task) => task.members?.some((member) => member.userId === user.id));
}

function todayIsoDay() {
	return new Date().toISOString().split('T')[0];
}

/** The picks belong to the employee they were made on, so another profile starts with every plan. */
interface PlanPicks {
	employeeId: string;
	planIds: string[];
}

function picksOf(planPicks: PlanPicks, employeeId: string) {
	if (planPicks.employeeId === employeeId) {
		return planPicks.planIds;
	}
	return NO_PICKS;
}

function PlansSkeleton() {
	const t = useTranslations();
	return (
		<div role="status" className="flex flex-col gap-4">
			<span className="sr-only">{t('common.LOADING')}</span>
			<div className="flex h-8 w-80 max-w-full items-center gap-0.5 rounded-lg bg-foreground/[0.05] p-0.5">
				<span className="h-7 w-20 rounded-md bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)]" />
			</div>
			<div className={TASK_GROUP_STACK}>
				<div className="flex min-h-9 items-center gap-2">
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-3 w-24')} />
					<span className={cn(TASK_ROW_SKELETON_BAR, 'h-3 w-6')} />
					<span className={cn(TASK_ROW_SKELETON_BAR, 'ml-auto h-3 w-40 max-sm:hidden')} />
				</div>
				<div className={TASK_LIST_SURFACE}>
					{SKELETON_ROWS.map((row) => (
						<TaskCardSkeleton key={row} />
					))}
				</div>
			</div>
		</div>
	);
}

interface IUserProfilePlansProps {
	user?: TUser;
	employeeId?: string; // Accept employeeId directly from parent
	filteredTasks?: TTask[];
}

export function UserProfilePlans(props: Readonly<IUserProfilePlansProps>) {
	const t = useTranslations();

	const { user, employeeId: propsEmployeeId, filteredTasks } = props;

	const filteredTaskIds = useMemo(() => filteredTasks?.map((task) => task.id), [filteredTasks]);

	const profile = useUserProfilePage();
	const { data: authUser } = useUserQuery();
	const authEmployeeId = authUser?.employee?.id ?? authUser?.employeeId ?? '';

	// The card of a member passes its employee; the profile page resolves it, so "See plans" and this tab agree
	const targetEmployeeId = useMemo(() => {
		if (propsEmployeeId) {
			return propsEmployeeId;
		}
		if (profile.isAuthUser) {
			return authEmployeeId;
		}
		return user?.employee?.id ?? user?.employeeId ?? '';
	}, [profile.isAuthUser, authEmployeeId, user, propsEmployeeId]);

	const {
		employeeFuturePlans,
		employeePastPlans,
		employeeTodayPlan,
		employeeOutstandingPlans,
		employeeSortedPlans,
		employeeDailyPlans,
		isLoading,
		isError,
		loadEmployeeDailyPlans
	} = useEmployeeDailyPlans(targetEmployeeId);
	const { deleteDailyPlan, deleteDailyPlanLoading } = useDeleteDailyPlan();
	const [currentOutstanding, setCurrentOutstanding] = useLocalStorageState<FilterOutstanding>('outstanding', 'DATE');
	const [currentTab, setCurrentTab] = useLocalStorageState<FilterTabs>('daily-plan-tab', 'Today Tasks');
	const { date: currentRange, setDate } = useDateRange(currentTab, targetEmployeeId);
	const { date: futureRange } = useDateRange('Future Tasks', targetEmployeeId);
	const { date: pastRange } = useDateRange('Past Tasks', targetEmployeeId);
	const { date: allRange } = useDateRange('All Tasks', targetEmployeeId);
	const setVisibleTabs = useSetAtom(dailyPlanVisibleTabsState);
	const setAllPlansModal = useSetAtom(allPlansModalState);
	const [planPicks, setPlanPicks] = useState<PlanPicks>({ employeeId: '', planIds: NO_PICKS });

	// The date picker of the profile filter bar lives in another tree: tell it which tab is on screen
	useEffect(() => {
		setVisibleTabs((prev) =>
			prev[targetEmployeeId] === currentTab ? prev : { ...prev, [targetEmployeeId]: currentTab }
		);
	}, [setVisibleTabs, targetEmployeeId, currentTab]);

	// A picked plan that was deleted in the meantime must not empty every view
	const pickedPlanIds = useMemo(() => {
		const picks = picksOf(planPicks, targetEmployeeId);
		if (picks.length === 0) {
			return NO_PICKS;
		}
		const existingIds = new Set(employeeDailyPlans.items.map((plan) => plan.id));
		return picks.filter((planId) => existingIds.has(planId));
	}, [planPicks, targetEmployeeId, employeeDailyPlans.items]);

	const setPickedPlanIds = useCallback(
		(planIds: string[]) => setPlanPicks({ employeeId: targetEmployeeId, planIds }),
		[targetEmployeeId]
	);
	const clearPicks = useCallback(() => setPickedPlanIds(NO_PICKS), [setPickedPlanIds]);

	const filterPlanAndTask = useCallback(
		(plans: TDailyPlan[]) => narrowPlans(plans, filteredTaskIds, pickedPlanIds),
		[filteredTaskIds, pickedPlanIds]
	);

	const path = usePathname();
	const { hasPlan } = useTimerPlanStatus();

	const activeTeam = useAtomValue(activeTeamState);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const [popupOpen, setPopupOpen] = useState(false);
	const canSeeActivity = useCanSeeActivityScreen();

	// On the first load of a profile, outstanding work opens the Outstanding view, once a day
	useEffect(() => {
		const today = todayIsoDay();
		const suggestionDate = window.localStorage.getItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
		const seenSuggestionDate = window.localStorage.getItem(HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL);
		const wasSuggestedToday = suggestionDate === today;
		const isOnProfile = isProfilePathname(path);
		if (wasSuggestedToday || !isOnProfile) {
			return;
		}
		if (estimatedTotalTime(employeeOutstandingPlans).totalTasks) {
			setCurrentTab('Outstanding');
		}
		const sawSuggestionToday = seenSuggestionDate === today;
		const meetsPlanRule = !requirePlan || Boolean(hasPlan);
		const stopsSuggestingToday = sawSuggestionToday && meetsPlanRule;
		if (stopsSuggestingToday) {
			window.localStorage.setItem(DAILY_PLAN_SUGGESTION_MODAL_DATE, today);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Track first visit to Outstanding tab for notifications
	useEffect(() => {
		if (currentTab !== 'Outstanding') return;

		try {
			const today = new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0];
			const lastVisited = window?.localStorage.getItem(HAS_VISITED_OUTSTANDING_TASKS);
			if (lastVisited !== today) {
				window.localStorage.setItem(HAS_VISITED_OUTSTANDING_TASKS, today);
			}
		} catch (error) {
			console.error('Error updating outstanding tasks visit date:', error);
		}
	}, [currentTab]);

	const totalTasksDailyPlansMap = useMemo(() => {
		const filteredFuturePlans = filterDailyPlan(futureRange, filterPlanAndTask(employeeFuturePlans));
		const filteredPastPlans = filterDailyPlan(pastRange, filterPlanAndTask(employeePastPlans));
		const filteredAllPlans = filterDailyPlan(allRange, filterPlanAndTask(employeeSortedPlans));
		const outstandingTasks = filterPlanAndTask(employeeOutstandingPlans).map((plan) =>
			tasksOfMember(plan.tasks ?? [], user)
		);
		const pickedTodayPlans = keepPickedPlans(employeeTodayPlan, pickedPlanIds);

		return {
			// Today and Future count every task of the plan, Past and All only the member's
			'Today Tasks': getTotalTasks(pickedTodayPlans, user, false),
			'Future Tasks': getTotalTasks(filteredFuturePlans, user, false),
			'Past Tasks': getTotalTasks(filteredPastPlans, user, true),
			'All Tasks': getTotalTasks(filteredAllPlans, user, true),
			Outstanding: estimatedTotalTime(outstandingTasks).totalTasks
		};
	}, [
		employeeTodayPlan,
		employeeFuturePlans,
		employeePastPlans,
		filterPlanAndTask,
		employeeSortedPlans,
		employeeOutstandingPlans,
		pickedPlanIds,
		user,
		futureRange,
		pastRange,
		allRange
	]);

	const hasAnyPlan = employeeDailyPlans.items?.length > 0;
	const isSettled = !isLoading;
	const showsPlans = isSettled && hasAnyPlan;
	// A failed refetch keeps the plans already on screen
	const isSettledWithoutPlans = isSettled && !hasAnyPlan;
	const showsError = isSettledWithoutPlans && isError;
	const showsNoPlanAtAll = isSettledWithoutPlans && !isError;

	const isOwnPlans = Boolean(targetEmployeeId) && targetEmployeeId === authEmployeeId;
	const hasPicks = pickedPlanIds.length > 0;
	const todayPlan = employeeTodayPlan[0];
	const isTodayView = currentTab === 'Today Tasks';
	const hasTodayPlan = Boolean(todayPlan);
	const showsDeleteTodayPlan = isTodayView && hasTodayPlan && canSeeActivity;
	const showsOutstandingGrouping = currentTab === 'Outstanding';
	const plansOfRangeTab = rangeTabPlansOf(currentTab, {
		future: employeeFuturePlans,
		past: employeePastPlans,
		all: employeeSortedPlans
	});
	const showsPlannedDateRange = plansOfRangeTab !== null;

	const openPlansDialog = useCallback(() => {
		setAllPlansModal({ isOpen: true, employeeId: targetEmployeeId });
	}, [setAllPlansModal, targetEmployeeId]);

	const changeTab = useCallback(
		(tab: FilterTabs) => {
			setDate(undefined);
			setCurrentTab(tab);
		},
		[setDate, setCurrentTab]
	);

	const deleteTodayPlan = async () => {
		try {
			if (requirePlan) {
				localStorage.removeItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
			}
			if (todayPlan?.id) {
				await deleteDailyPlan(todayPlan.id);
			}
		} catch (error) {
			logErrorInDev('Failed to delete the plan of today', error);
		} finally {
			setPopupOpen(false);
		}
	};

	const planViewItems = PLAN_VIEWS.map((view) => ({
		value: view,
		label: t(PLAN_VIEW_LABEL_KEYS[view]),
		count: totalTasksDailyPlansMap[view]
	}));

	const outstandingGroupingItems = OUTSTANDING_GROUPINGS.map((grouping) => ({
		value: grouping,
		label: t(OUTSTANDING_LABEL_KEYS[grouping])
	}));

	const planMyDayAction = isOwnPlans && (
		<Button type="button" variant="outline" size="default" onClick={openPlansDialog}>
			{t('modals.dailyPlan.planMyDay')}
		</Button>
	);

	let viewEmptyState: ReactNode = undefined;
	if (hasPicks) {
		viewEmptyState = (
			<EmptyPlans
				title={t('profile.plans.NO_PICKED_PLAN_HERE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={clearPicks}>
						{t('profile.plans.SHOW_EVERY_PLAN')}
					</Button>
				}
			/>
		);
	}
	let todayEmptyState = viewEmptyState;
	const offersPlanMyDayToday = !hasPicks && isOwnPlans;
	if (offersPlanMyDayToday) {
		todayEmptyState = <EmptyPlans action={planMyDayAction} />;
	}

	const viewProps = {
		profile,
		user,
		filteredTaskIds,
		employeeId: targetEmployeeId,
		pickedPlanIds,
		emptyState: viewEmptyState
	};

	const outstandingViews: Record<FilterOutstanding, ReactNode> = {
		ALL: (
			<OutstandingAll
				profile={profile}
				user={user}
				outstandingPlans={employeeOutstandingPlans}
				filteredTaskIds={filteredTaskIds}
				pickedPlanIds={pickedPlanIds}
				emptyState={viewEmptyState}
			/>
		),
		DATE: (
			<OutstandingFilterDate
				profile={profile}
				user={user}
				outstandingPlans={employeeOutstandingPlans}
				filterByEmployee
				filteredTaskIds={filteredTaskIds}
				pickedPlanIds={pickedPlanIds}
				emptyState={viewEmptyState}
			/>
		)
	};

	const planViews: Record<FilterTabs, ReactNode> = {
		'Today Tasks': <AllPlans {...viewProps} currentTab={currentTab} emptyState={todayEmptyState} />,
		'Future Tasks': <FutureTasks {...viewProps} />,
		'Past Tasks': <PastTasks {...viewProps} />,
		'All Tasks': <AllPlans {...viewProps} />,
		Outstanding: outstandingViews[currentOutstanding]
	};

	return (
		<div ref={profile.loadTaskStatsIObserverRef} className="w-full">
			{isLoading && <PlansSkeleton />}
			{showsError && (
				<DashboardErrorNotice
					title={t('profile.plans.LOAD_FAILED')}
					onRetry={() => void loadEmployeeDailyPlans()}
				/>
			)}
			{showsPlans && (
				<div className={TASK_LIST_STACK}>
					<div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
						<div className="-m-1 min-w-0 max-w-full overflow-x-auto p-1 no-scrollbar">
							<SegmentedControl
								items={planViewItems}
								value={currentTab}
								onValueChange={changeTab}
								ariaLabel={t('profile.plans.VIEWS_LABEL')}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{showsOutstandingGrouping && (
								<SegmentedControl
									items={outstandingGroupingItems}
									value={currentOutstanding}
									onValueChange={setCurrentOutstanding}
									ariaLabel={t('profile.plans.OUTSTANDING_GROUPING')}
								/>
							)}
							{showsDeleteTodayPlan && (
								<AlertPopup
									open={popupOpen}
									buttonOpen={
										<Button
											type="button"
											onClick={() => {
												setPopupOpen((prev) => !prev);
											}}
											variant="outline"
											className="text-destructive-ink"
										>
											{t('common.plan.DELETE_THIS_PLAN')}
										</Button>
									}
								>
									<Button
										type="button"
										disabled={deleteDailyPlanLoading}
										onClick={() => void deleteTodayPlan()}
										variant="destructive"
									>
										{deleteDailyPlanLoading && <ReloadIcon className="size-4 animate-spin" />}
										{t('common.DELETE')}
									</Button>
									<Button type="button" onClick={() => setPopupOpen(false)} variant="outline">
										{t('common.CANCEL')}
									</Button>
								</AlertPopup>
							)}
							{showsPlannedDateRange && (
								<TaskDatePickerWithRange
									data={plansOfRangeTab ?? undefined}
									date={currentRange}
									onSelect={(range: DateRange | undefined) => setDate(range)}
									label={t('profile.plans.PLANNED_DATE')}
									contentClassName="mt-0 mb-0 h-8 w-auto lg:mt-0"
								/>
							)}
							<DailyPlanFilter
								employeeId={targetEmployeeId}
								pickedPlanIds={pickedPlanIds}
								onPickedPlanIdsChange={setPickedPlanIds}
							/>
							<ViewsHeaderTabs />
						</div>
					</div>
					{planViews[currentTab]}
				</div>
			)}
			{showsNoPlanAtAll && <EmptyPlans action={planMyDayAction} />}
		</div>
	);
}
