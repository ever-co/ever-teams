'use client';
import { secondsToTime } from '@/core/lib/helpers/index';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useMemberIdentity,
	useMemberActiveTask,
	useTeamMemberMutations,
	useTeamMemberRoleActions,
	useUserProfilePage
} from '@/core/hooks';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useIsListedTeamManager } from '@/core/hooks/organizations/teams/use-team-member';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import {
	activeTaskStatisticsState,
	activeTeamScopeState,
	timerSecondsState,
	userDetailAccordion as userAccordion
} from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Button, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { TaskEstimateInfo } from './task-estimate';
import { TaskInfo } from './task-info';
import { UserInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { ACTIVITY_TAB_LABEL_KEYS } from '@/core/components/activities/activity-tab-labels';
import { teamTasksPagesLoadingState } from '@/core/stores/teams/team-tasks';
import {
	MemberActivityPanelSkeleton,
	MemberEstimateCellSkeleton,
	MemberTaskCellSkeleton,
	MemberTimesCellSkeleton,
	MemberTotalCellSkeleton
} from '@/core/components/teams/member-row-skeleton';
import { Analytics, ChevronDown, DragHandle, Spinner } from '@/core/components/icons';
import { TASK_PROPERTY_PILL_RECIPE } from '@/core/components/tasks/task-property-trigger';
import { ChevronDoubleDownIcon } from '@heroicons/react/20/solid';
import { AppsTab } from '@/core/components/pages/profile/apps';
import { VisitedSitesTab } from '@/core/components/pages/profile/visited-sites';
import { FilterTab } from '@/app/[locale]/(main)/profile/[memberId]/page';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { ScreenshootTab } from '@/core/components/pages/profile/screenshots/screenshoots';
import { InputField } from '@/core/components/duplicated-components/_input';
import { LazyUserProfileTask, LazyUserTeamActivity } from '@/core/components/optimized-components';
import { TaskTimes, TodayWorkedTime } from '@/core/components/tasks/task-times';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { TActivityFilter } from '@/core/types/schemas';
import { cn } from '@/core/lib/helpers';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	MEMBER_CARD_PADDING,
	MEMBER_CELL,
	MEMBER_CELL_CENTER,
	MEMBER_FIRST_CELL,
	MEMBER_GRID_FROM,
	MEMBER_MENU_CELL,
	MEMBER_ROW_GRID,
	MEMBER_ROW_MIN_HEIGHT,
	MEMBER_STACK_UNTIL
} from '@/core/components/teams/member-row-grid';
import { UserTeamActivitySkeleton } from '@/core/components/common/skeleton/profile-component-skeletons';
import { normalizeProfileActivityTimeZone } from '@/core/hooks/activities/use-profile-activity';
import type { TProfileActivityScope } from '@/core/types/schemas/activities/profile-activity.schema';

type IUserTeamCard = {
	active?: boolean;
	member?: any;
	publicTeam?: boolean;
	members?: IOrganizationTeam['members'];
	draggable: boolean;
	onDragStart: () => any;
	onDragEnter: () => any;
	onDragEnd: any;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => any;
	currentExit: boolean;
	/** The team's statistics (times of the day) are still loading: the time cells show their skeleton. */
	statsPending?: boolean;
} & IClassName;

// Memoized ChevronToggleButton to prevent unnecessary re-renders
const ChevronToggleButton = React.memo(
	({
		isExpanded,
		userId,
		onToggle,
		onActivityClose
	}: {
		isExpanded: boolean;
		userId?: string;
		onToggle: (value: string) => void;
		onActivityClose: () => void;
	}) => {
		const handleClick = useCallback(() => {
			onToggle(isExpanded ? '' : (userId ?? ''));
			onActivityClose();
		}, [isExpanded, userId, onToggle, onActivityClose]);

		return (
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleClick}
				className="absolute inset-y-0 right-2 my-auto text-muted-foreground"
			>
				<ChevronDoubleDownIcon
					className={clsxm('size-4 transition-transform duration-200', isExpanded && 'rotate-180')}
				/>
			</Button>
		);
	}
);

const ACTIVITY_TOGGLE =
	'cursor-pointer gap-1.5 text-foreground outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

const ACTIVITY_TOGGLE_OPEN = 'bg-foreground/5 ring-foreground/15 hover:bg-foreground/5';

export const UserTeamCard = React.memo(function UserTeamCard({
	className,
	active,
	member,
	publicTeam = false,
	draggable = false,
	onDragStart = () => null,
	onDragEnd = () => null,
	onDragEnter = () => null,
	onDragOver = () => null,
	statsPending = false
}: IUserTeamCard) {
	const t = useTranslations();
	const { data: user } = useUserQuery();

	const [userDetailAccordion, setUserDetailAccordion] = useAtom(userAccordion);
	// Granular hooks — "pay only for what you use"
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const tasksPagesLoading = useAtomValue(teamTasksPagesLoadingState);
	const isTaskListPending = !memberTask && tasksPagesLoading;
	const isTaskPending = isTaskListPending || statsPending;
	const isTimesPending = isTaskPending || statsPending;
	const mutations = useTeamMemberMutations(member);
	const roleActions = useTeamMemberRoleActions(member);

	// Lightweight composition — only what TaskEstimateInfo actually consumes
	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);

	const taskEdition = useTMCardTaskEdit(memberTask);
	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(identity.memberUser);

	const setActivityFilter = useSetAtom(activityTypeState);

	const [showActivity, setShowActivity] = React.useState<boolean>(false);
	const isConnectedUserManager = useIsListedTeamManager(user?.id);
	// The ids alone: the card is rendered once per member and the team is rebuilt on every refresh of its members
	const activeTeam = useAtomValue(activeTeamScopeState);

	// Memoize accordion state early to use in daily plan options
	const isAccordionExpanded = useMemo(() => {
		return userDetailAccordion === identity.memberUser?.id;
	}, [userDetailAccordion, identity.memberUser?.id]);

	const targetEmployeeId = identity.isAuthUser ? user?.employee?.id : identity.member?.employeeId;

	// Memoize callback to prevent unnecessary re-renders
	const showActivityFilter = useCallback(
		(type: 'DATE' | 'TICKET', member: any | null) => {
			setShowActivity((prev) => !prev);
			setUserDetailAccordion('');
			setActivityFilter((prev: TActivityFilter) => ({
				...prev,
				type,
				member
			}));
		},
		[setUserDetailAccordion, setActivityFilter]
	);

	const menu = (
		<>
			{(!collaborativeSelect || active) && (
				<UserTeamCardMenu
					identity={identity}
					memberTask={memberTask}
					mutations={mutations}
					roleActions={roleActions}
					edition={taskEdition}
				/>
			)}

			{collaborativeSelect && !active && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm('mr-1 w-4 h-4 border-none accent-primary-light', 'border-2 border-primary-light')}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
	const [activityFilter, setActivity] = useState<FilterTab>('Tasks');
	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivity(filter);
		},
		[setActivity]
	);
	const canSeeActivity = useMemo(() => {
		// Correct logic for team-members context
		// In team-members view, we compare memberUserId with connectedUserId, not profile
		const isOwnCard = identity.memberUser?.id === user?.id;
		const isManager = isConnectedUserManager;
		const result = isOwnCard || isManager;

		return result;
	}, [identity.memberUser?.id, user?.id, isConnectedUserManager]);
	const activityScope = useMemo<TProfileActivityScope | undefined>(() => {
		if (publicTeam || !canSeeActivity || !targetEmployeeId || !activeTeam?.tenantId || !activeTeam.organizationId) {
			return undefined;
		}

		return {
			tenantId: activeTeam.tenantId,
			organizationId: activeTeam.organizationId,
			organizationTeamId: activeTeam.id,
			employeeId: targetEmployeeId,
			timeZone: normalizeProfileActivityTimeZone(user?.timeZone)
		};
	}, [
		activeTeam?.id,
		activeTeam?.organizationId,
		activeTeam?.tenantId,
		canSeeActivity,
		publicTeam,
		targetEmployeeId,
		user?.timeZone
	]);

	const handleActivityClose = useCallback(() => setShowActivity(false), []);
	const shouldShowChevron = !publicTeam && canSeeActivity;
	const showsActivityPanel = canSeeActivity && !showActivity;
	const showsActivityToggle = canSeeActivity && !statsPending;
	const showsPlainTotal = !canSeeActivity && !statsPending;
	return (
		<div
			className="group/row relative"
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnter={onDragEnter}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
		>
			<div className={clsxm(MEMBER_GRID_FROM, MEMBER_CARD_PADDING, 'py-2', className)}>
				<div
					className={cn(
						MEMBER_ROW_GRID,
						MEMBER_ROW_MIN_HEIGHT,
						'relative',
						isAccordionExpanded && !showActivity && 'hairline-b border-border pb-2'
					)}
				>
					<div className="absolute -left-3.5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/60 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
						<DragHandle className="size-3.5" />
					</div>

					{/* Member: avatar, name, e-mail and the details toggle */}
					<div className={cn(MEMBER_FIRST_CELL, 'relative')}>
						<UserInfo memberInfo={identity} className="w-full pr-9" publicTeam={publicTeam} />
						{shouldShowChevron && (
							<ChevronToggleButton
								isExpanded={isAccordionExpanded}
								userId={identity.memberUser?.id}
								onToggle={setUserDetailAccordion}
								onActivityClose={handleActivityClose}
							/>
						)}
					</div>

					{/* Task information */}
					<div className={cn(MEMBER_CELL, 'justify-between gap-1')}>
						{isTaskPending && <MemberTaskCellSkeleton />}
						{!isTaskPending && (
							<TaskInfo
								edition={taskEdition}
								className="w-full min-w-0 flex-1 overflow-y-hidden"
								publicTeam={publicTeam}
								tab="default"
							/>
						)}
					</div>

					{/* Time on the task */}
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						{isTimesPending && <MemberTimesCellSkeleton />}
						{!isTimesPending && (
							<TaskTimes
								activeAuthTask={true}
								memberInfo={identity}
								task={memberTask}
								isAuthUser={identity.isAuthUser}
								className="flex flex-col gap-1"
							/>
						)}
					</div>

					{/* Estimate */}
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						{isTaskPending && <MemberEstimateCellSkeleton />}
						{!isTaskPending && (
							<TaskEstimateInfo
								memberInfo={memberInfo}
								edition={taskEdition}
								activeAuthTask={true}
								className="w-full max-w-52 min-w-0"
								useActiveTeamTaskByDefault={false}
								allowEmptyTask={false}
							/>
						)}
					</div>

					{/* Total today */}
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER)}>
						{statsPending && <MemberTotalCellSkeleton />}
						{showsActivityToggle && (
							<button
								type="button"
								aria-expanded={showActivity}
								onClick={() => showActivityFilter('DATE', identity.member ?? null)}
								className={cn(
									TASK_PROPERTY_PILL_RECIPE,
									ACTIVITY_TOGGLE,
									showActivity && ACTIVITY_TOGGLE_OPEN
								)}
							>
								<Analytics />
								<span className="sr-only">{t('common.ACTIVITY_FOR_TODAY')}</span>
								<TodayWorkedTime
									isAuthUser={identity.isAuthUser}
									className="text-sm font-medium tabular-nums"
									memberInfo={identity}
								/>
								<ChevronDown
									className={cn('transition-transform duration-200', showActivity && 'rotate-180')}
								/>
							</button>
						)}
						{showsPlainTotal && (
							<TodayWorkedTime
								isAuthUser={identity.isAuthUser}
								className="text-right text-sm font-medium tabular-nums"
								memberInfo={identity}
							/>
						)}
					</div>

					<div className={MEMBER_MENU_CELL}>{menu}</div>
				</div>
				{isAccordionExpanded && (
					<ExpandedMemberDetails
						employeeId={targetEmployeeId ?? null}
						showsActivityPanel={showsActivityPanel}
						member={member}
						activityScope={activityScope}
						activityFilter={activityFilter}
						onActivityFilterChange={changeActivityFilter}
					/>
				)}
				{showActivity && (
					<Suspense fallback={<UserTeamActivitySkeleton />}>
						<LazyUserTeamActivity
							showActivity={showActivity}
							member={member}
							canSeeActivity={canSeeActivity}
						/>
					</Suspense>
				)}
			</div>
			<div className={clsxm('relative flex flex-col px-3 py-3', MEMBER_STACK_UNTIL, className)}>
				<div className="mb-3 flex items-center justify-between">
					<UserInfo memberInfo={identity} publicTeam={publicTeam} className="w-9/12" />
					{identity.isAuthUser && <AuthUserTotalWork member={member} />}
				</div>

				<div className="flex flex-wrap items-start justify-between hairline-b border-dashed border-border pb-3">
					<TaskInfo edition={taskEdition} className="px-1" publicTeam={publicTeam} tab="default" />
				</div>

				<div className="mt-3 flex items-center justify-between gap-5">
					<div className="flex items-center gap-4">
						<TaskTimes
							activeAuthTask={true}
							memberInfo={identity}
							task={memberTask}
							isAuthUser={identity.isAuthUser}
							className="tabular-nums"
						/>
					</div>

					<TaskEstimateInfo
						memberInfo={memberInfo}
						edition={taskEdition}
						activeAuthTask={true}
						useActiveTeamTaskByDefault={false}
						allowEmptyTask={false}
					/>
				</div>

				{/* EverCard menu */}
				<div className="absolute right-1 top-2">{menu}</div>
			</div>
			{/* {currentExit && (
				<HorizontalSeparator className="mt-2 !border-primary-light dark:!border-primary-light !border-t-2" />
			)} */}
		</div>
	);
});

// Only the authenticated member's card shows this total, so only that card subscribes to the per-second timer
function AuthUserTotalWork({ member }: Readonly<{ member: IUserTeamCard['member'] }>) {
	const t = useTranslations();
	const seconds = useAtomValue(timerSecondsState);
	const statActiveTask = useAtomValue(activeTaskStatisticsState);
	const activeTaskTotalStat = statActiveTask.total;

	const { hours: h, minutes: m } = secondsToTime(
		((member?.totalTodayTasks &&
			member?.totalTodayTasks.reduce(
				(previousValue: number, currentValue: TTaskStatistics) => previousValue + (currentValue.duration || 0),
				0
			)) ||
			activeTaskTotalStat?.duration ||
			0) + seconds
	);

	return (
		<div className="mr-10 flex flex-col items-end gap-0.5 font-normal">
			<span className="text-xs text-muted-foreground">{t('common.TOTAL_TIME')}:</span>
			<Text className="text-xs font-medium tabular-nums">
				{h}h : {m}m
			</Text>
		</div>
	);
}

type ExpandedMemberDetailsProps = Omit<MemberActivityPanelProps, 'isLoading'> & {
	employeeId: string | null;
	showsActivityPanel: boolean;
};

// Mounted only while the row is expanded: the member's plans query and their calculations do not run for every row
function ExpandedMemberDetails({
	employeeId,
	showsActivityPanel,
	...panelProps
}: Readonly<ExpandedMemberDetailsProps>) {
	const { isLoading, isFetching } = useEmployeeDailyPlans(employeeId);
	const isLoadingMemberData = isLoading || isFetching;

	if (!showsActivityPanel) {
		return (
			<div className="flex h-20 w-full items-center justify-center">
				<Spinner className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return <MemberActivityPanel {...panelProps} isLoading={isLoadingMemberData} />;
}

type MemberActivityPanelProps = {
	member: IUserTeamCard['member'];
	activityScope?: TProfileActivityScope;
	activityFilter: FilterTab;
	onActivityFilterChange: (filter: FilterTab) => void;
	isLoading: boolean;
};

// Mounted only in the expanded card, so the profile and task filter hooks run once instead of once per member row
function MemberActivityPanel({
	member,
	activityScope,
	activityFilter,
	onActivityFilterChange,
	isLoading
}: Readonly<MemberActivityPanelProps>) {
	const t = useTranslations();
	const profile = useUserProfilePage();
	// Use isolated tab state for UserTeamCard to prevent global state leak from profile page
	// With 'auto' default: shows daily plans if user has them, otherwise shows assigned tasks
	const hook = useTaskFilter(profile, { persistState: false, defaultTab: 'auto', statsCount: 0 });

	const activityScreens = useMemo(() => {
		return {
			Tasks: (
				<LazyUserProfileTask
					profile={profile}
					tabFiltered={hook}
					user={member?.employee?.user}
					employeeId={member?.employeeId}
					activityScope={activityScope}
					paginateTasks={true}
					useVirtualization={hook.tasksFiltered?.length > ITEMS_LENGTH_TO_VIRTUALIZED}
				/>
			),
			Screenshots: <ScreenshootTab />,
			Apps: <AppsTab />,
			'Visited Sites': <VisitedSitesTab />
		};
	}, [activityScope, profile, hook, member?.employee?.user, member?.employeeId]);

	const activityTabItems = (Object.keys(activityScreens) as FilterTab[]).map((filter) => ({
		value: filter,
		label: t(ACTIVITY_TAB_LABEL_KEYS[filter])
	}));

	return (
		<div className="-mx-2 h-96 overflow-y-auto px-2 pb-2" ref={profile.loadTaskStatsIObserverRef}>
			{isLoading ? (
				<MemberActivityPanelSkeleton />
			) : (
				// Show content once loaded
				<>
					<div className="pb-3 pt-4">
						<SegmentedControl
							items={activityTabItems}
							value={activityFilter}
							onValueChange={onActivityFilterChange}
							ariaLabel={t('common.ACTIVITY')}
						/>
					</div>
					{activityScreens[activityFilter] ?? null}
				</>
			)}
		</div>
	);
}
