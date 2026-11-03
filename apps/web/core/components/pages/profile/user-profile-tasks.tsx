import { I_UserProfilePage, useLiveTimerStatus } from '@/core/hooks';
import { I_TaskFilter, ITab } from './task-filters';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	ComponentProps,
	memo,
	ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState
} from 'react';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { ActivityFilters, ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useTaskFilterCache } from '@/core/hooks/common/use-memoized-cache';
import { UserProfilePlans } from '@/core/components/users/user-profile-plans';
import { TUser } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { LazyActivityCalendar, LazyTaskCard } from '@/core/components/optimized-components';
import { ActivityCalendarSkeleton } from '../../common/skeleton/activity-calendar-skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TaskCardSkeleton, UserProfileTaskSkeleton } from '../../common/skeleton/profile-component-skeletons';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import type { TProfileActivityScope } from '@/core/types/schemas/activities/profile-activity.schema';
import type { FilterTab } from '@/app/[locale]/(main)/profile/[memberId]/page';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { ACTIVITY_TAB_LABEL_KEYS } from '@/core/components/activities/activity-tab-labels';
import { TaskListMemberProvider } from '@/core/components/tasks/task-list-member-context';
import {
	TASK_GROUP_COUNT,
	TASK_GROUP_LABEL,
	TASK_GROUP_STACK,
	TASK_LIST_STACK,
	TASK_LIST_SURFACE,
	CURRENT_TASK_SURFACE
} from '@/core/components/tasks/task-row-recipes';
import { personFullName } from '@/core/lib/utils/profile-figures';

/** The Worked tab's sub-views, drawn by the page: the tasks list, or one of the activity screens in its place. */
export type ProfileActivityView = {
	isVisible: boolean;
	value: FilterTab;
	onChange: (value: FilterTab) => void;
	screen: ReactNode;
};

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	paginateTasks?: boolean;
	useVirtualization?: boolean;
	user?: TUser;
	employeeId?: string;
	activityScope?: TProfileActivityScope;
	activityView?: ProfileActivityView;
};

type TaskListTab = Extract<ITab, 'worked' | 'assigned' | 'unassigned'>;

type TaskRowViewType = 'default' | 'unassign';

// Only the authenticated member's live total is computed here; another member's would be an invented zero.
const NOT_COMPUTED_VALUE = '–';

const TASK_LIST_TABS: ReadonlySet<ITab> = new Set<ITab>(['worked', 'assigned', 'unassigned']);

const ACTIVITY_VIEW_ITEMS: ReadonlyArray<{ value: FilterTab; filter: ActivityFilters }> = [
	{ value: 'Tasks', filter: ActivityFilters.TASKS },
	{ value: 'Screenshots', filter: ActivityFilters.SCREENSHOOTS },
	{ value: 'Apps', filter: ActivityFilters.APPS },
	{ value: 'Visited Sites', filter: ActivityFilters.VISITED_SITES }
];

const EMPTY_TAB_KEYS: Record<TaskListTab, DottedLanguageObjectStringPaths> = {
	worked: 'profile.rows.EMPTY_WORKED',
	assigned: 'profile.rows.EMPTY_ASSIGNED',
	unassigned: 'profile.rows.EMPTY_UNASSIGNED'
};

const PAGE_SCROLL_OWNER_SELECTOR = '[data-page-scroll-owner="true"]';
const SCROLLING_OVERFLOWS: ReadonlySet<string> = new Set(['auto', 'scroll', 'overlay']);
const WIDE_ROW_CONTAINER_REM = 64;
const WIDE_ROW_HEIGHT = 53;
const STACKED_ROW_HEIGHT = 96;
const VIRTUAL_OVERSCAN = 4;

function viewTypeFor(tab: ITab): TaskRowViewType {
	if (tab === 'unassigned') {
		return 'unassign';
	}
	return 'default';
}

function isTaskListTab(tab: ITab): tab is TaskListTab {
	return TASK_LIST_TABS.has(tab);
}

function uniqueTasksOf(tasks: TTask[]) {
	const seen = new Set<string>();
	return tasks.filter((task) => {
		if (seen.has(task.id)) {
			return false;
		}
		seen.add(task.id);
		return true;
	});
}

function personKindOf(isAuthUser: boolean) {
	if (isAuthUser) {
		return 'self';
	}
	return 'other';
}

function noMatchTitleKey(isSearching: boolean, isFiltering: boolean): DottedLanguageObjectStringPaths {
	const isBoth = isSearching && isFiltering;
	if (isBoth) {
		return 'profile.rows.NO_MATCH_SEARCH_AND_FILTERS';
	}
	if (isSearching) {
		return 'dailyPlan.editor.NO_MATCH';
	}
	return 'profile.rows.NO_MATCH_FILTERS';
}

function isScrollingElement(element: HTMLElement) {
	const { overflowY } = window.getComputedStyle(element);
	return SCROLLING_OVERFLOWS.has(overflowY);
}

/**
 * What scrolls the list: a panel that scrolls on its own (the member card's activity panel), otherwise the page's
 * single scroll owner. The window never scrolls in this app.
 */
function scrollOwnerOf(list: HTMLElement) {
	let ancestor = list.parentElement;
	while (ancestor) {
		const isPageOwner = ancestor.matches(PAGE_SCROLL_OWNER_SELECTOR);
		if (isPageOwner) {
			return ancestor;
		}
		if (isScrollingElement(ancestor)) {
			return ancestor;
		}
		ancestor = ancestor.parentElement;
	}
	return null;
}

/** Where the list starts inside the scrolled content, whatever the owner's current scroll position. */
function offsetInside(list: HTMLElement, owner: HTMLElement) {
	const listTop = list.getBoundingClientRect().top;
	const contentTop = owner.getBoundingClientRect().top + owner.clientTop;
	return listTop - contentTop + owner.scrollTop;
}

function remInPixels() {
	const rootFontSize = window.getComputedStyle(document.documentElement).fontSize;
	return Number.parseFloat(rootFontSize);
}

function estimatedRowHeight(isWide: boolean) {
	if (isWide) {
		return WIDE_ROW_HEIGHT;
	}
	return STACKED_ROW_HEIGHT;
}

/**
 * Tasks of the profile's task tabs: on Worked, the task being tracked under "Now" and the last day's tasks under
 * their own label; on Assigned and Unassigned, one surface of rows. Stats and Planned render their own views.
 */
export const UserProfileTask = memo(
	({ profile, tabFiltered, useVirtualization = false, user, employeeId, activityScope, activityView }: Props) => {
		const timerStatus = useAtomValue(timerStatusState);
		const { memoizeTaskFilter } = useTaskFilterCache();

		const isMemberRunning = profile.member?.running === true;
		const activeTaskId = profile.activeUserTeamTask?.id;

		const otherTasks = useMemo(() => {
			return memoizeTaskFilter(
				() => {
					const uniqueTasks = uniqueTasksOf(tabFiltered.tasksFiltered);
					const hidesActiveTask = isMemberRunning && Boolean(activeTaskId);
					if (!hidesActiveTask) {
						return uniqueTasks;
					}
					return uniqueTasks.filter((task) => task.id !== activeTaskId);
				},
				tabFiltered.tasksFiltered,
				{
					isRunning: profile.member?.running,
					activeTaskId,
					tab: tabFiltered.tab
				}
			);
		}, [
			memoizeTaskFilter,
			tabFiltered.tasksFiltered,
			tabFiltered.tab,
			profile.member?.running,
			isMemberRunning,
			activeTaskId
		]);

		const tab = tabFiltered.tab;
		const isWorkedTab = tab === 'worked';
		const isAuthUserTracking = profile.isAuthUser && Boolean(timerStatus?.running);
		const isMemberTracking = Boolean(profile.member?.employee?.isTrackingTime);
		const isTrackingNow = isMemberTracking || isAuthUserTracking;
		const showsActiveTask = isWorkedTab && isTrackingNow;

		const isActivityViewVisible = activityView?.isVisible === true;
		const showsActivitySwitch = isWorkedTab && isActivityViewVisible;
		const isTasksView = activityView?.value === 'Tasks';
		const showsActivityScreen = showsActivitySwitch && !isTasksView;
		const showsTaskTab = isTaskListTab(tab);
		const showsTasks = showsTaskTab && !showsActivityScreen;
		const enableVirtualization = useVirtualization || otherTasks.length > ITEMS_LENGTH_TO_VIRTUALIZED;

		return (
			<div className="flex w-full flex-col gap-4">
				{showsActivitySwitch && activityView && (
					<ActivityViewSwitch value={activityView.value} onChange={activityView.onChange} />
				)}
				{showsActivityScreen && activityView?.screen}
				{showsTasks && (
					<TaskListMemberProvider profile={profile}>
						<TaskTabBody
							profile={profile}
							tabFiltered={tabFiltered}
							items={otherTasks}
							showsActiveTask={showsActiveTask}
							enableVirtualization={enableVirtualization}
						/>
					</TaskListMemberProvider>
				)}
				{tab === 'stats' && (
					<Suspense fallback={<ActivityCalendarSkeleton />}>
						<LazyActivityCalendar scope={activityScope} />
					</Suspense>
				)}
				{tab === 'dailyplan' && (
					<UserProfilePlans filteredTasks={otherTasks} user={user} employeeId={employeeId} />
				)}
			</div>
		);
	}
);

UserProfileTask.displayName = 'UserProfileTask';

function ActivityViewSwitch({ value, onChange }: Readonly<{ value: FilterTab; onChange: (value: FilterTab) => void }>) {
	const t = useTranslations();
	const items = ACTIVITY_VIEW_ITEMS.map((item) => ({
		value: item.value,
		label: t(ACTIVITY_TAB_LABEL_KEYS[item.filter])
	}));
	return (
		<div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
			<SegmentedControl items={items} value={value} onValueChange={onChange} ariaLabel={t('common.ACTIVITY')} />
		</div>
	);
}

function TaskTabBody({
	profile,
	tabFiltered,
	items,
	showsActiveTask,
	enableVirtualization
}: Readonly<{
	profile: I_UserProfilePage;
	tabFiltered: I_TaskFilter;
	items: TTask[];
	showsActiveTask: boolean;
	enableVirtualization: boolean;
}>) {
	const t = useTranslations();
	const isWorkedTab = tabFiltered.tab === 'worked';
	const hasItems = items.length > 0;
	const showsLastDayGroup = isWorkedTab && hasItems;
	const list = (
		<TaskList
			items={items}
			tabFiltered={tabFiltered}
			profile={profile}
			enableVirtualization={enableVirtualization}
			showsActiveTask={showsActiveTask}
		/>
	);

	return (
		<div className={TASK_LIST_STACK}>
			{showsActiveTask && <NowGroup profile={profile} />}
			{showsLastDayGroup && (
				<section className={TASK_GROUP_STACK}>
					<div className={TASK_GROUP_LABEL}>
						<h2>{t('common.LAST_24_HOURS')}</h2>
						<span className={TASK_GROUP_COUNT}>{items.length}</span>
					</div>
					{list}
				</section>
			)}
			{!showsLastDayGroup && list}
		</div>
	);
}

function NowGroup({ profile }: Readonly<{ profile: I_UserProfilePage }>) {
	const t = useTranslations();
	return (
		<section className={TASK_GROUP_STACK}>
			<div className={cn(TASK_GROUP_LABEL, 'justify-between')}>
				<h2>{t('common.NOW')}</h2>
				<span className="flex items-baseline gap-1.5">
					<span>{t('common.TOTAL_TIME')}</span>
					{profile.isAuthUser && <LiveTotalTime />}
					{!profile.isAuthUser && (
						<span className="text-[13px] font-medium tabular-nums">{NOT_COMPUTED_VALUE}</span>
					)}
				</span>
			</div>
			<div className={CURRENT_TASK_SURFACE}>
				<LazyTaskCard
					active
					task={profile.activeUserTeamTask}
					isAuthUser={profile.isAuthUser}
					activeAuthTask={true}
					profile={profile}
				/>
			</div>
		</section>
	);
}

// Reads the per-second clock here so a tick re-renders this text, not the whole tab and its task rows
function LiveTotalTime() {
	const { time } = useLiveTimerStatus();

	return (
		<span className="text-[13px] font-medium tabular-nums text-foreground">
			{time.h}h {time.m}m
		</span>
	);
}

/**
 * Tasks already shown once skip the placeholder frame when they scroll back into view, so a list scrolled up and
 * down does not flicker.
 */
const renderedTasksCache = new Set<string>();

/**
 * A row the virtualizer mounts while scrolling shows its skeleton for one frame and the real row on the next, so a
 * fast scroll paints placeholders instead of freezing on rows that mount a chip strip, a status menu and an estimate.
 */
const DeferredTaskCard = memo((props: ComponentProps<typeof LazyTaskCard>) => {
	const taskId = props.task?.id;
	const wasRendered = taskId ? renderedTasksCache.has(taskId) : false;
	const [isReady, setIsReady] = useState(wasRendered);

	useEffect(() => {
		if (wasRendered || !taskId) return;

		const frameId = requestAnimationFrame(() => {
			setIsReady(true);
			renderedTasksCache.add(taskId);
		});

		return () => cancelAnimationFrame(frameId);
	}, [taskId, wasRendered]);

	if (!isReady) {
		return <TaskCardSkeleton />;
	}

	return <LazyTaskCard {...props} />;
});
DeferredTaskCard.displayName = 'DeferredTaskCard';

/** The tab has tasks, but the search or the filters hide all of them: say which, and offer the way back. */
function NoMatchingTasks({ tabFiltered }: Readonly<{ tabFiltered: I_TaskFilter }>) {
	const t = useTranslations();
	const isSearching = tabFiltered.isSearchingByName;
	const isFiltering = tabFiltered.hasAppliedStatusFilter;
	const titleKey = noMatchTitleKey(isSearching, isFiltering);
	const { setTaskName, onResetStatusFilter } = tabFiltered;
	const clearSearch = useCallback(() => setTaskName(''), [setTaskName]);

	const actions = (
		<div className="flex flex-wrap items-center justify-center gap-2">
			{isSearching && (
				<Button type="button" variant="outline" size="sm" onClick={clearSearch}>
					{t('dashboard.timesheets.CLEAR_SEARCH')}
				</Button>
			)}
			{isFiltering && (
				<Button type="button" variant="outline" size="sm" onClick={onResetStatusFilter}>
					{t('common.CLEAR_FILTERS')}
				</Button>
			)}
		</div>
	);

	return (
		<div className={TASK_LIST_SURFACE}>
			<BlockEmptyMessage title={t(titleKey)} action={actions} />
		</div>
	);
}

/** A tab with really no task: one sentence for that tab, in the frame of the list. */
function EmptyTaskTab({ tab, profile }: Readonly<{ tab: TaskListTab; profile: I_UserProfilePage }>) {
	const t = useTranslations();
	const name = personFullName(profile.userProfile);
	const person = personKindOf(profile.isAuthUser);
	return (
		<div className={TASK_LIST_SURFACE}>
			<BlockEmptyMessage title={t(EMPTY_TAB_KEYS[tab], { person, name })} />
		</div>
	);
}

type TaskListProps = {
	items: TTask[];
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	enableVirtualization: boolean;
	showsActiveTask: boolean;
};

const TaskList = memo(
	({ items, tabFiltered, profile, enableVirtualization, showsActiveTask }: Readonly<TaskListProps>) => {
		const { isFirstLoad: isTasksFirstLoad } = useTeamTasksLoadState();
		const tab = tabFiltered.tab;
		const viewType = viewTypeFor(tab);
		const isAuthUser = profile.isAuthUser;
		const hasItems = items.length > 0;

		const renderRow = useCallback(
			(task: TTask) => (
				<LazyTaskCard
					task={task}
					isAuthUser={isAuthUser}
					activeAuthTask={false}
					viewType={viewType}
					profile={profile}
				/>
			),
			[isAuthUser, viewType, profile]
		);
		const renderDeferredRow = useCallback(
			(task: TTask) => (
				<DeferredTaskCard
					task={task}
					isAuthUser={isAuthUser}
					activeAuthTask={false}
					viewType={viewType}
					profile={profile}
				/>
			),
			[isAuthUser, viewType, profile]
		);

		if (!hasItems) {
			if (!isTaskListTab(tab)) {
				return null;
			}
			if (isTasksFirstLoad) {
				return <UserProfileTaskSkeleton />;
			}
			if (showsActiveTask) {
				return null;
			}
			const isNarrowedByUser = tabFiltered.isSearchingByName || tabFiltered.hasAppliedStatusFilter;
			if (isNarrowedByUser) {
				return <NoMatchingTasks tabFiltered={tabFiltered} />;
			}
			return <EmptyTaskTab tab={tab} profile={profile} />;
		}

		if (!enableVirtualization) {
			return <TaskRows items={items} renderRow={renderRow} />;
		}
		return <VirtualTaskRows items={items} renderRow={renderRow} renderDeferredRow={renderDeferredRow} />;
	}
);

TaskList.displayName = 'TaskList';

type RenderRow = (task: TTask) => ReactNode;

function TaskRows({
	items,
	renderRow,
	listRef
}: Readonly<{ items: TTask[]; renderRow: RenderRow; listRef?: (list: HTMLUListElement | null) => void }>) {
	return (
		<ul ref={listRef} className={TASK_LIST_SURFACE}>
			{items.map((task) => (
				<li key={task.id}>{renderRow(task)}</li>
			))}
		</ul>
	);
}

/** `undefined` until the list is in the page, then the element that scrolls it, or `null` when nothing does. */
type ScrollOwnerState = HTMLElement | null | undefined;

/**
 * Finds what scrolls the list and where the list starts inside it, measured again whenever the scrolled content
 * changes size (the band, the groups above, the rows themselves). The width tells the row height to expect.
 */
function useListScrollOwner() {
	const [list, setList] = useState<HTMLUListElement | null>(null);
	const [scrollOwner, setScrollOwner] = useState<ScrollOwnerState>(undefined);
	const [scrollMargin, setScrollMargin] = useState(0);
	const [isWide, setIsWide] = useState(false);

	useLayoutEffect(() => {
		if (!list) {
			return;
		}
		const owner = scrollOwnerOf(list);
		setScrollOwner(owner);
		if (!owner) {
			return;
		}
		const measure = () => {
			setScrollMargin(offsetInside(list, owner));
			const wideWidth = WIDE_ROW_CONTAINER_REM * remInPixels();
			setIsWide(list.clientWidth >= wideWidth);
		};
		measure();
		const observer = new ResizeObserver(measure);
		const content = owner.firstElementChild ?? owner;
		observer.observe(content);
		return () => observer.disconnect();
	}, [list]);

	return { listRef: setList, scrollOwner, scrollMargin, isWide };
}

/**
 * A long list renders only the rows in view and a few around them, following the element that really scrolls, so
 * every row renders when it is scrolled to.
 */
function VirtualTaskRows({
	items,
	renderRow,
	renderDeferredRow
}: Readonly<{ items: TTask[]; renderRow: RenderRow; renderDeferredRow: RenderRow }>) {
	const { listRef, scrollOwner, scrollMargin, isWide } = useListScrollOwner();
	const rowHeight = estimatedRowHeight(isWide);
	const estimateSize = useCallback(() => rowHeight, [rowHeight]);
	const getItemKey = useCallback((index: number) => items[index]?.id ?? index, [items]);
	const getScrollElement = useCallback(() => scrollOwner ?? null, [scrollOwner]);

	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns functions the React Compiler cannot memoize, so this component stays out of it, as the team tasks list does
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement,
		estimateSize,
		getItemKey,
		overscan: VIRTUAL_OVERSCAN,
		scrollMargin
	});

	const hasNoScrollOwner = scrollOwner === null;
	if (hasNoScrollOwner) {
		return <TaskRows items={items} renderRow={renderRow} listRef={listRef} />;
	}

	return (
		<ul ref={listRef} className={cn(TASK_LIST_SURFACE, 'relative')} style={{ height: virtualizer.getTotalSize() }}>
			{virtualizer.getVirtualItems().map((virtualItem) => {
				const task = items[virtualItem.index];
				const offset = virtualItem.start - scrollMargin;
				return (
					<li
						key={virtualItem.key}
						data-index={virtualItem.index}
						ref={virtualizer.measureElement}
						className="absolute inset-x-0 top-0"
						style={{ transform: `translateY(${offset}px)` }}
					>
						{renderDeferredRow(task)}
					</li>
				);
			})}
		</ul>
	);
}
