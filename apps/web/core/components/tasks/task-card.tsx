'use client';
import { getDailyPlanDay } from '@/core/lib/helpers/index';
import {
	I_UserProfilePage,
	I_TeamMemberMutationsHook,
	useCanSeeActivityScreen,
	useModal,
	useTMCardTaskEdit
} from '@/core/hooks';
import { useMyDailyPlans } from '@/core/hooks/daily-plans/use-my-daily-plans';
import { usePlanTaskForDay } from '@/core/hooks/daily-plans/use-plan-task-for-day';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { TaskDrawerLink } from './drawer/task-drawer-link';
import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import {
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { activeTeamTaskState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuPortal
} from '@/core/components/common/dropdown-menu';
import { SpinnerLoader } from '@/core/components';
import Link from 'next/link';
import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SetStateAction, useAtomValue } from 'jotai';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { TaskAvatars } from './task-items';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';
import { TaskPropertyIcon } from './task-property-icon';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Calendar, FileText, MoreVertical, Spinner, Star, Trash, UserAdd, UserRemove } from '@/core/components/icons';
import { CreateDailyPlanFormModal } from '../features/daily-plan/create-daily-plan-form-modal';
import moment from 'moment';
import { TimerPlanDialogs } from '@/core/components/features/daily-plan/timer-plan-dialogs';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useIsTrackingEnabledFor } from '@/core/hooks/organizations/teams/use-active-team-member';
import { Nullable, SetAtom } from '@/core/types/generics';
import { EIssueType } from '@/core/types/generics/enums/task';
import { TaskEstimateInfo } from '../pages/teams/team/team-members-views/user-team-card/task-estimate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../common/tooltip';
import { AddTaskToPlan } from '../features/daily-plan/add-task-to-plan';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { taskNumberLabel } from '@/core/lib/utils/team-tasks-view';
import { TDailyPlan, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { useTimerButtonLogic } from '@/core/hooks/tasks/use-timer-button';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { TaskListMemberValue, useTaskListMember, useTaskListMemberValue } from './task-list-member-context';
import {
	TASK_ROW,
	TASK_ROW_CHIPS_CELL,
	TASK_ROW_CHIP_STRIP,
	TASK_ROW_DETAIL_CELL,
	TASK_ROW_MENU_CELL,
	TASK_ROW_META,
	TASK_ROW_STATUS_CELL,
	TASK_ROW_TASK_CELL,
	TASK_ROW_TIMER_CELL,
	TASK_ROW_TIMES,
	TASK_ROW_WORKED_CELL
} from './task-row-recipes';

/** The plan actions render their own button, which the menu item recipe cannot reach through `asChild`. */
const planActionRowsClassName =
	"flex flex-col [&_button]:flex [&_button]:h-8 [&_button]:w-full [&_button]:items-center [&_button]:gap-2.5 [&_button]:rounded-md [&_button]:px-2 [&_button]:text-[13px] [&_button:hover]:bg-foreground/5 [&_button:focus-visible]:bg-foreground/5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-muted-foreground";

const MENU_SPINNER = <Spinner className="size-4 animate-spin" />;

const TASK_TITLE_LINK =
	'group/title flex min-w-0 items-baseline gap-1.5 rounded-sm text-[13px] font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';

const TASK_TITLE_TEXT = 'min-w-0 truncate decoration-foreground/30 underline-offset-2 group-hover/title:underline';

const OVERLAPPER_DIAMETER = 28;

function favoriteMenuLabelKey(isFavorite: boolean) {
	if (isFavorite) {
		return 'common.REMOVE_FAVORITE_TASK' as const;
	}
	return 'common.ADD_FAVORITE_TASK' as const;
}

function assignmentMenuLabelKey(isAssigned: boolean) {
	if (isAssigned) {
		return 'common.UNASSIGN_TASK_FROM_ME' as const;
	}
	return 'common.ASSIGN_TASK_TO_ME' as const;
}

function assignmentErrorKey(isAssigning: boolean) {
	if (isAssigning) {
		return 'common.TASK_ASSIGN_ERROR' as const;
	}
	return 'common.TASK_UNASSIGN_ERROR' as const;
}

function assignmentMenuIcon(isAssigning: boolean, isAssigned: boolean) {
	if (isAssigning) {
		return MENU_SPINNER;
	}
	if (isAssigned) {
		return <UserRemove />;
	}
	return <UserAdd />;
}

function assignHintKey(hasMembers: boolean) {
	if (hasMembers) {
		return 'profile.rows.ASSIGN_TO_MORE_PEOPLE' as const;
	}
	return 'profile.rows.ASSIGN_THIS_TASK' as const;
}

function issueTypeOf(task: TTask) {
	return task.issueType || EIssueType.TASK;
}

function overlapperImagesOf(task: Nullable<TTask>): ImageOverlapperProps[] {
	const members = task?.members ?? [];
	return members.map((member) => ({
		id: member.user?.id ?? '',
		url: member.user?.imageUrl ?? '',
		alt: member.user?.firstName ?? ''
	}));
}

/** The list's member data belongs to one profile: a row of another profile reads its own. */
function isListMemberOf(
	listMember: TaskListMemberValue | null,
	profileUserId: string | undefined
): listMember is TaskListMemberValue {
	if (!listMember) {
		return false;
	}
	return listMember.profileUserId === profileUserId;
}

type Props = {
	active?: boolean;
	task?: Nullable<TTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	editTaskId?: string | null;
	setEditTaskId?: SetAtom<[SetStateAction<string | null>], void>;
	/** Kept for the callers; the row draws the issue type on its own plate. */
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
	plan?: TDailyPlan;
	planMode?: FilterTabs;
	/** Kept for the callers; the row's grid sizes the task column. */
	taskContentClassName?: string;
} & IClassName;

type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

function TaskCardContent(props: Props) {
	const listMember = useTaskListMember();
	const profileUserId = props.profile?.userProfile?.id;
	const readsListMember = isListMemberOf(listMember, profileUserId);
	if (readsListMember) {
		return <TaskRow {...props} member={listMember} />;
	}
	return <TaskRowWithOwnMember {...props} />;
}

function TaskRowWithOwnMember(props: Props) {
	const member = useTaskListMemberValue(props.profile?.userProfile?.id);
	return <TaskRow {...props} member={member} />;
}

/**
 * One task as a row of its list, laid out by the width of the list's surface. The current task carries a Live mark
 * after its title; its surface, not the row, sets it apart.
 */
function TaskRow({ member, ...props }: Props & { member: TaskListMemberValue }) {
	const {
		active,
		className,
		task,
		isAuthUser,
		activeAuthTask,
		viewType = 'default',
		profile,
		taskTitleClassName,
		plan,
		planMode
	} = props;
	const { currentMember, authMember, memberInfo, authMutations, canSeeActivity } = member;
	const [loading, setLoading] = useState(false);
	const planModal = useModal();
	const isPlanModalMounted = useHasBeenOpen(planModal.isOpen);
	const planModalEmployeeId = profile?.member?.employeeId ?? '';
	const taskEdition = useTMCardTaskEdit(task);

	const isCurrent = Boolean(active);
	const isUnassignView = viewType === 'unassign';
	const showsTotal = !isUnassignView;
	const showsEstimate = viewType === 'default' || viewType === 'dailyplan';
	const hasListedMember = Boolean(currentMember) || Boolean(authMember);
	const showsMenu = Boolean(task) && hasListedMember;
	const showsAssignOverlapper = isUnassignView && canSeeActivity;

	return (
		<>
			<div className={clsxm(TASK_ROW, className)}>
				<div className={TASK_ROW_TIMER_CELL}>
					<TaskCardTimerButton className="size-7" />
				</div>
				<TaskRowTitle task={task} isCurrent={isCurrent} titleClassName={taskTitleClassName} />
				<div className={TASK_ROW_META}>
					<div className={TASK_ROW_CHIPS_CELL}>
						{task && (
							<TaskAllStatusTypes
								task={task}
								tab={viewType}
								dayPlanTab={planMode}
								className={TASK_ROW_CHIP_STRIP}
							/>
						)}
					</div>
					<div className={TASK_ROW_WORKED_CELL}>
						<TaskTimes
							activeAuthTask={activeAuthTask}
							task={task}
							isAuthUser={isAuthUser}
							className={TASK_ROW_TIMES}
							valueClassName="text-xs"
							showTotal={showsTotal}
							memberInfo={memberInfo}
						/>
					</div>
					<div className={TASK_ROW_DETAIL_CELL}>
						{showsEstimate && (
							<TaskEstimateInfo
								plan={plan}
								memberInfo={memberInfo}
								edition={taskEdition}
								activeAuthTask={activeAuthTask}
								className="w-full min-w-0"
							/>
						)}
						{isUnassignView && <TaskRowAssignees task={task} showsOverlapper={showsAssignOverlapper} />}
					</div>
					<div className={TASK_ROW_STATUS_CELL}>
						<ActiveTaskStatusDropdown
							task={task}
							onChangeLoading={setLoading}
							className="w-full min-w-0 max-w-full"
						/>
					</div>
				</div>
				<div className={TASK_ROW_MENU_CELL}>
					{showsMenu && task && (
						<TaskCardMenu
							task={task}
							loading={loading}
							mutations={authMutations}
							viewType={viewType}
							profile={profile}
							plan={plan}
							planMode={planMode}
							onPlanSomeDay={planModal.openModal}
						/>
					)}
				</div>
			</div>
			{isPlanModalMounted && task && (
				<CreateDailyPlanFormModal
					open={planModal.isOpen}
					closeModal={planModal.closeModal}
					taskId={task.id}
					employeeId={planModalEmployeeId}
					planMode={EDailyPlanMode['CUSTOM']}
				/>
			)}
		</>
	);
}

function TaskRowTitle({
	task,
	isCurrent,
	titleClassName
}: Readonly<{ task: Nullable<TTask> | undefined; isCurrent: boolean; titleClassName?: string }>) {
	if (!task) {
		return (
			<div className={TASK_ROW_TASK_CELL}>
				<span className="text-[13px] text-muted-foreground">–</span>
			</div>
		);
	}
	const number = taskNumberLabel(task);
	const hasNumber = number.length > 0;
	return (
		<div className={TASK_ROW_TASK_CELL}>
			<TaskPropertyIcon kind="issueType" name={issueTypeOf(task)} />
			<TaskDrawerLink taskId={task.id} title={task.title} className={TASK_TITLE_LINK}>
				{hasNumber && <span className="shrink-0 font-normal tabular-nums text-muted-foreground">{number}</span>}
				<span className={clsxm(TASK_TITLE_TEXT, titleClassName)}>{task.title}</span>
			</TaskDrawerLink>
			{isCurrent && <LiveMark />}
		</div>
	);
}

function LiveMark() {
	const t = useTranslations();
	return (
		<span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-success-foreground">
			<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
			{t('common.LIVE')}
		</span>
	);
}

/** Who is on an unassigned task and, under the action rule, the control that assigns more people. */
function TaskRowAssignees({
	task,
	showsOverlapper
}: Readonly<{ task: Nullable<TTask> | undefined; showsOverlapper: boolean }>) {
	const t = useTranslations();
	const images = useMemo(() => overlapperImagesOf(task), [task]);
	const hasMembers = images.length > 0;
	return (
		<div className="flex w-full min-w-0 items-center gap-2">
			<TaskRowPeople task={task ?? null} />
			{showsOverlapper && (
				<ImageComponent
					radius={40}
					diameter={OVERLAPPER_DIAMETER}
					images={images}
					item={task}
					hasActiveMembers={hasMembers}
					hasInfo={t(assignHintKey(hasMembers))}
				/>
			)}
		</div>
	);
}

/** The people on the task as a stack of faces, the count in its name; a task with nobody says so in words. */
function TaskRowPeople({ task }: Readonly<{ task: Nullable<TTask> }>) {
	const t = useTranslations();
	const memberCount = task?.members?.length ?? 0;
	const peopleLabel = assignedPeopleLabel(t, memberCount);
	const hasMembers = memberCount > 0;
	if (!hasMembers || !task) {
		return <span className="min-w-0 truncate text-xs text-muted-foreground">{peopleLabel}</span>;
	}
	return (
		<span role="img" aria-label={peopleLabel} title={peopleLabel} className="flex shrink-0 items-center">
			<TaskAvatars task={task} limit={3} />
		</span>
	);
}

export const TaskCard = React.memo(function TaskCard(props: Props) {
	const { task, isAuthUser } = props;
	const { data: user } = useUserQuery();
	const isTrackingEnabled = useIsTrackingEnabledFor(user?.id);
	const content = <TaskCardContent {...props} />;

	const showsTimer = isTrackingEnabled && isAuthUser;
	if (!showsTimer || !task) {
		return content;
	}
	// The content is passed as an element: the timer's own updates re-render the button, not the card
	return <TaskTimerController task={task}>{content}</TaskTimerController>;
});

function assignedPeopleLabel(t: ReturnType<typeof useTranslations>, count: number) {
	if (count > 0) {
		return t('profile.rows.PEOPLE_COUNT', { count });
	}
	return t('task.tabFilter.NO_TASK_USER_ASSIGNED');
}

type TaskTimerControls = ReturnType<typeof useTaskTimerControls> & { task: TTask };

const TaskTimerControlsContext = React.createContext<TaskTimerControls | null>(null);

// The timer logic of one card, run once per card whatever its layout, with the dialogs a start may open
function useTaskTimerControls(task: TTask) {
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const logic = useTimerButtonLogic({ task });

	return {
		...logic,
		activeTeamTask
	};
}

// Above the card's layouts: its loading state and dialogs survive a resize across the layout breakpoint
export function TaskTimerController({ task, children }: PropsWithChildren<{ task: TTask }>) {
	const controls = useTaskTimerControls(task);
	const value = { ...controls, task };

	return (
		<TaskTimerControlsContext.Provider value={value}>
			{children}
			{!controls.loading && <TaskTimerDialogs controls={value} />}
		</TaskTimerControlsContext.Provider>
	);
}

function TaskTimerDialogs({ controls }: Readonly<{ controls: TaskTimerControls }>) {
	return <TimerPlanDialogs modals={controls.modals} />;
}

/** The card's start/stop button, where its layout puts it. Nothing without a TaskTimerController above. */
export function TaskCardTimerButton({ className }: IClassName) {
	const controls = React.useContext(TaskTimerControlsContext);
	if (!controls) {
		return null;
	}
	return <TaskTimerButton controls={controls} className={className} />;
}

function TaskTimerButton({ controls, className }: Readonly<{ controls: TaskTimerControls } & IClassName>) {
	const {
		task,
		loading,
		activeTaskStatus,
		optimisticRunning,
		startTimerWithTask,
		startStopTimerHandler,
		canTrack,
		disabled
	} = controls;

	// Use optimistic state if available, otherwise use real state
	const displayRunning = optimisticRunning ?? activeTaskStatus?.running;

	const blockedByPlan = !activeTaskStatus && task.status !== 'closed' && !canTrack;
	const planReasonId = useId();
	const startButtonRef = useRef<HTMLButtonElement>(null);
	// Set when this card's "Add to today's plan" succeeds: the focused action goes away with the tooltip once Start is enabled.
	const refocusStartRef = useRef(false);

	useEffect(() => {
		if (blockedByPlan || !refocusStartRef.current) return;
		refocusStartRef.current = false;
		// Give focus back to Start only when it was lost with the tooltip, never take it from another control.
		const active = document.activeElement;
		if (!active || active === document.body) startButtonRef.current?.focus();
	}, [blockedByPlan]);

	if (loading) {
		return <SpinnerLoader size={30} />;
	}

	const timerButton = (
		<TimerButton
			ref={startButtonRef}
			onClick={activeTaskStatus ? startStopTimerHandler : startTimerWithTask}
			running={displayRunning}
			disabled={activeTaskStatus ? disabled : task.status === 'closed' || !canTrack}
			aria-describedby={blockedByPlan ? planReasonId : undefined}
			className={clsxm('w-14 h-14', className)}
		/>
	);

	if (!blockedByPlan) {
		return timerButton;
	}

	return (
		<PlanRequiredTooltip
			taskId={task.id}
			reasonId={planReasonId}
			onPlanned={() => {
				refocusStartRef.current = true;
			}}
		>
			{timerButton}
		</PlanRequiredTooltip>
	);
}

// Explains a Start button greyed by the team's "require a plan to track" rule and offers the "plan for today" action.
function PlanRequiredTooltip({
	taskId,
	reasonId,
	onPlanned,
	children
}: PropsWithChildren<{ taskId: string; reasonId: string; onPlanned: () => void }>) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const reason = t('timer.PLAN_REQUIRED_TO_START');

	// The tooltip holds a focusable action: keyboard focus moving between the Start button and that action keeps it open.
	return (
		<TooltipProvider>
			<Tooltip open={open} onOpenChange={setOpen}>
				<div
					ref={containerRef}
					className="inline-flex"
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
					}}
				>
					<TooltipTrigger
						asChild
						onBlur={(event) => {
							if (containerRef.current?.contains(event.relatedTarget)) event.preventDefault();
						}}
					>
						<div className="inline-flex">{children}</div>
					</TooltipTrigger>
					<TooltipContent aria-label={reason} className="flex flex-col gap-1 items-start max-w-xs text-xs">
						<p>{reason}</p>
						<div className="font-medium text-primary-ink hover:underline">
							<PlanTask
								planMode={EDailyPlanMode.TODAY}
								taskId={taskId}
								employeeId={user?.employee?.id}
								label={t('dailyPlan.ADD_TO_TODAY_PLAN')}
								onPlanned={onPlanned}
							/>
						</div>
					</TooltipContent>
					<span id={reasonId} hidden>
						{reason}
					</span>
				</div>
			</Tooltip>
		</TooltipProvider>
	);
}

//* Task Estimate info *
//* Task Info FC *
// Memoize TaskInfo to prevent unnecessary re-renders
export const TaskInfo = React.memo(
	({
		className,
		task,
		taskBadgeClassName,
		taskTitleClassName,
		tab = 'default',
		dayPlanTab
	}: IClassName & {
		tab?: 'default' | 'unassign' | 'dailyplan';
		dayPlanTab?: FilterTabs;
		task?: Nullable<TTask>;
		taskBadgeClassName?: string;
		taskTitleClassName?: string;
	}) => {
		return (
			<div className={clsxm('h-full flex flex-col items-start justify-between gap-3', className)}>
				{/* task */}
				{!task && <div className="self-center py-1 text-center">--</div>}
				{task && (
					<div className="overflow-hidden w-full h-10">
						<div className={clsxm('flex flex-col justify-start items-start h-full')}>
							<div
								className={clsxm(
									'overflow-hidden relative w-full h-full text-sm cursor-pointer text-ellipsis'
								)}
							>
								<TaskNameInfoDisplay
									task={task}
									taskIssueStatusClassName={clsxm(taskBadgeClassName)}
									taskTitleClassName={clsxm(taskTitleClassName)}
									className="h-full"
								/>
								<TaskDrawerLink
									taskId={task.id}
									className="absolute inset-0 opacity-0"
									aria-label={task.title}
								/>
							</div>
						</div>
					</div>
				)}

				{/* Task status */}
				{task && <TaskAllStatusTypes task={task} tab={tab} dayPlanTab={dayPlanTab} />}
				{!task && <div className="self-center py-1 text-center">--</div>}
			</div>
		);
	}
);

function getTeammateEmployeeId(profile?: I_UserProfilePage): string | null {
	const profileEmployeeId = profile?.member?.employeeId;
	if (!profileEmployeeId || profile?.isAuthUser) {
		return null;
	}
	return profileEmployeeId;
}

/** The plan entries act on the profile's member, so on a teammate's profile they follow that member's plans */
function useMenuPlans(profile?: I_UserProfilePage) {
	const myPlans = useMyDailyPlans();
	const teammateEmployeeId = getTeammateEmployeeId(profile);
	const isTeammateProfile = teammateEmployeeId !== null;
	const teammatePlans = useEmployeeDailyPlans(teammateEmployeeId, { enabled: isTeammateProfile });

	if (isTeammateProfile) {
		return {
			isTeammateProfile,
			ensurePlans: teammatePlans.ensureEmployeeDailyPlans,
			todayPlans: teammatePlans.employeeTodayPlan,
			futurePlans: teammatePlans.employeeFuturePlans,
			isPlansLoading: teammatePlans.isLoading
		};
	}
	return {
		isTeammateProfile,
		ensurePlans: myPlans.ensureMyDailyPlans,
		todayPlans: myPlans.myTodayPlan,
		futurePlans: myPlans.myFuturePlans,
		isPlansLoading: myPlans.isLoading
	};
}

/**
 * It's a dropdown menu that allows the user to remove the task.
 */
export function TaskCardMenu({
	task,
	loading,
	mutations,
	viewType,
	profile,
	plan,
	planMode,
	onPlanSomeDay
}: {
	task: TTask;
	loading?: boolean;
	mutations?: I_TeamMemberMutationsHook;
	viewType: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	plan?: TDailyPlan;
	planMode?: FilterTabs;
	/** Opens a "plan for some day" dialog the caller renders; without it the menu renders its own. */
	onPlanSomeDay?: () => void;
}) {
	const t = useTranslations();
	const { closeModal, isOpen, openModal } = useModal();
	const ownsPlanModal = !onPlanSomeDay;
	const openPlanModal = onPlanSomeDay ?? openModal;
	const isPlanModalMounted = useHasBeenOpen(isOpen);
	const { toggleFavoriteTask, isFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();

	// Get the current logged-in user to check if they are already assigned to the task
	const { data: user } = useUserQuery();

	// Check if the logged-in user is already assigned to this task
	// This determines whether to show "Assign Task to Me" or "Unassign Task from Me"
	const isUserAssignedToTask = useMemo(() => {
		if (!user?.id || !task.members) return false;
		return task.members.some((member) => member.userId === user.id || member.user?.id === user.id);
	}, [user?.id, task.members]);

	// Loading state for assignment action
	const [isAssigning, setIsAssigning] = useState(false);

	const handleAssignment = useCallback(() => {
		// Guard clause: if mutations is not available, we cannot assign/unassign
		if (!mutations) {
			console.warn('[TaskCardMenu] mutations is undefined, cannot assign/unassign task');
			return;
		}

		// Use dynamic check: if user is already assigned, unassign; otherwise assign
		const shouldAssign = !isUserAssignedToTask;

		setIsAssigning(true);

		const promise = shouldAssign ? mutations.assignTask(task) : mutations.unassignTask(task);

		promise
			.catch((error: unknown) => {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t(assignmentErrorKey(shouldAssign)), {
					description: t(reasonKey),
					id: `task-assignment-error-${task.id}`
				});
			})
			.finally(() => {
				setIsAssigning(false);
			});
	}, [mutations, task, isUserAssignedToTask, t]);

	const canSeeActivity = useCanSeeActivityScreen();
	const { myPermissions } = useMyRolePermissionsQuery();

	const { isTeammateProfile, ensurePlans, todayPlans, futurePlans, isPlansLoading } = useMenuPlans(profile);

	// The API lets only the team's managers, or a holder of CHANGE_SELECTED_EMPLOYEE, change another member's plans
	const canActForOthers = myPermissions.includes('CHANGE_SELECTED_EMPLOYEE');
	const canPlanForTeammate = canSeeActivity || canActForOthers;
	const canPlanForProfileMember = !isTeammateProfile || canPlanForTeammate;
	const canRemoveForTeammate = isTeammateProfile && canPlanForTeammate;
	const showRemoveEntries = canSeeActivity || canRemoveForTeammate;

	const isOutstandingTab = viewType === 'dailyplan' && planMode === 'Outstanding';
	const isPlanEntriesView = viewType === 'default' || isOutstandingTab;
	const showPlanEntries = isPlanEntriesView && canPlanForProfileMember;

	const taskPlannedToday = useMemo(() => {
		const lastTodayPlan = todayPlans[todayPlans.length - 1];
		return lastTodayPlan?.tasks?.find((planTask) => planTask.id === task.id);
	}, [task.id, todayPlans]);

	const allPlans = [...todayPlans, ...futurePlans];
	const isTaskPlannedMultipleTimes =
		allPlans.reduce((count, plan) => {
			if (plan?.tasks) {
				const taskCount = plan.tasks.filter((planTask) => planTask.id === task.id).length;
				return count + taskCount;
			}
			return count;
		}, 0) > 1;

	const taskPlannedTomorrow = useMemo(
		() =>
			futurePlans
				.filter((_plan) => getDailyPlanDay(_plan.date) === moment().add(1, 'day').format('YYYY-MM-DD'))[0]
				?.tasks?.find((planTask) => planTask.id === task.id),
		[futurePlans, task.id]
	);

	// Combine loading states: external loading OR assignment in progress
	const isMenuLoading = loading || isAssigning;
	const isFavoriteLoading = addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading;

	// The plan items read the plans of the profile's member: teams without a plan requirement do not preload the
	// personal ones, and a teammate's may have changed elsewhere since they were read
	const handleMenuOpenChange = (open: boolean) => {
		if (open) {
			void ensurePlans();
		}
	};

	return (
		<>
			<DropdownMenu onOpenChange={handleMenuOpenChange}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label={t('common.MORE_OPTIONS')}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-foreground/5 data-[state=open]:text-foreground"
					>
						{!isMenuLoading && <MoreVertical className="size-4" />}
						{isMenuLoading && <SpinnerLoader size={16} />}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuPortal>
					<DropdownMenuContent align="end" className="min-w-44">
						<DropdownMenuItem asChild>
							<Link href={`/task/${task.id}`} className="w-full whitespace-nowrap">
								<FileText />
								{t('common.TASK_DETAILS')}
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer" onSelect={() => toggleFavoriteTask(task)}>
							{isFavoriteLoading && MENU_SPINNER}
							{!isFavoriteLoading && <Star />}
							<span className="whitespace-nowrap">
								{t(favoriteMenuLabelKey(isFavoriteTask(task.id)))}
							</span>
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer" onSelect={handleAssignment} disabled={isAssigning}>
							{assignmentMenuIcon(isAssigning, isUserAssignedToTask)}
							<span className="whitespace-nowrap">{t(assignmentMenuLabelKey(isUserAssignedToTask))}</span>
						</DropdownMenuItem>

						{showPlanEntries && (
							<>
								<DropdownMenuSeparator />
								<div className={planActionRowsClassName}>
									{/* Until the first read lands the plans look empty, and a planned task would be offered again */}
									{!taskPlannedToday && !isPlansLoading && (
										<DropdownMenuItem asChild>
											<PlanTask
												planMode={EDailyPlanMode.TODAY}
												icon={<Calendar />}
												taskId={task.id}
												employeeId={profile?.member?.employeeId ?? ''}
												taskPlannedToday={taskPlannedToday}
											/>
										</DropdownMenuItem>
									)}
									{!taskPlannedTomorrow && !isPlansLoading && (
										<DropdownMenuItem asChild>
											<PlanTask
												planMode={EDailyPlanMode.TOMORROW}
												icon={<Calendar />}
												taskId={task.id}
												employeeId={profile?.member?.employeeId ?? ''}
												taskPlannedForTomorrow={taskPlannedTomorrow}
											/>
										</DropdownMenuItem>
									)}
									<DropdownMenuItem asChild>
										<PlanTask
											planMode={EDailyPlanMode.CUSTOM}
											icon={<Calendar />}
											taskId={task.id}
											employeeId={profile?.member?.employeeId ?? ''}
											openModal={openPlanModal}
										/>
									</DropdownMenuItem>
								</div>
							</>
						)}

						{viewType === 'dailyplan' && (planMode === 'Today Tasks' || planMode === 'Future Tasks') && (
							<>
								{showRemoveEntries ? (
									<div>
										<DropdownMenuSeparator />
										<RemoveTaskFromPlan member={profile?.member} task={task} plan={plan} />
										{isTaskPlannedMultipleTimes && (
											<RemoveManyTaskFromPlan task={task} member={profile?.member} />
										)}
									</div>
								) : (
									<></>
								)}
							</>
						)}
						{/* <DropdownMenuItem>
					<ConfirmDropdown
						className="right-[110%] top-0"
						onConfirm={() => {
							console.log('remove task...', task);
						}}
					>
						<Text
							className={clsxm(
								'font-normal whitespace-nowrap hover:font-semibold',
								'text-red-500'
							)}
						>
							{t('common.REMOVE')}
						</Text>
					</ConfirmDropdown>
				</DropdownMenuItem> */}
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenu>

			{ownsPlanModal && isPlanModalMounted && (
				<CreateDailyPlanFormModal
					open={isOpen}
					closeModal={closeModal}
					taskId={task.id}
					employeeId={profile?.member?.employeeId ?? ''}
					planMode={EDailyPlanMode['CUSTOM']}
				/>
			)}
		</>
	);
}

export function PlanTask({
	planMode,
	taskId,
	employeeId,
	chooseMember = false,
	taskPlannedToday,
	taskPlannedForTomorrow,
	openModal,
	label,
	icon,
	onPlanned
}: {
	taskId: string;
	planMode: EDailyPlanMode;
	employeeId?: string;
	chooseMember?: boolean;
	taskPlannedToday?: TTask;
	taskPlannedForTomorrow?: TTask;
	openModal?: () => void;
	/** Replaces the default label of the plan mode */
	label?: string;
	icon?: ReactNode;
	/** Called once the plan is created, in today and tomorrow modes */
	onPlanned?: () => void;
}) {
	const t = useTranslations();
	const { planTaskForDay, isPlanning, createDailyPlanLoading } = usePlanTaskForDay();
	const isPending = isPlanning;

	const handleOpenModal = async () => {
		try {
			const opensCustomModal = planMode === 'custom' && Boolean(openModal);
			if (opensCustomModal) {
				openModal?.();
				// Note: Toast for custom plan will be shown when the plan is actually created in the modal
			} else if (planMode === 'today') {
				planTaskForDay('today', taskId, employeeId, onPlanned);
			} else {
				planTaskForDay('tomorrow', taskId, employeeId, onPlanned);
			}
		} catch (error) {
			console.error('Plan modal error:', error);
			toast.error(t('task.toastMessages.TASK_PLAN_FAILED'));
		}
	};

	const todayLabel = label ?? t('dailyPlan.PLAN_FOR_TODAY');
	const tomorrowLabel = label ?? t('dailyPlan.PLAN_FOR_TOMORROW');

	return (
		<div>
			<button
				className={clsxm(
					'whitespace-nowrap text-left transition-colors',
					'h-auto cursor-pointer disabled:cursor-default disabled:opacity-50'
				)}
				onClick={handleOpenModal}
				disabled={planMode === 'today' && createDailyPlanLoading}
			>
				{icon}
				{planMode === 'today' && !taskPlannedToday && (
					<span className="">
						{isPending || createDailyPlanLoading ? (
							<Spinner className="mr-2 size-4 animate-spin" />
						) : (
							todayLabel
						)}
					</span>
				)}
				{planMode === 'tomorrow' && !taskPlannedForTomorrow && (
					<span>
						{isPending || createDailyPlanLoading ? (
							<Spinner className="mr-2 size-4 animate-spin" />
						) : (
							tomorrowLabel
						)}
					</span>
				)}
				{planMode === 'custom' && (label ?? t('dailyPlan.PLAN_FOR_SOME_DAY'))}
			</button>
		</div>
	);
}

export function AddTaskToPlanComponent({ task, employee }: { task: TTask; employee?: IEmployee }) {
	const t = useTranslations();
	const { closeModal, isOpen, openModal } = useModal();
	return (
		<>
			<button
				type="button"
				className={clsxm('whitespace-nowrap transition-colors', 'cursor-pointer')}
				onClick={openModal}
			>
				{t('dailyPlan.ADD_TASK_TO_PLAN')}
			</button>
			<AddTaskToPlan closeModal={closeModal} open={isOpen} task={task} employee={employee} />
		</>
	);
}

const REMOVE_FROM_PLAN_ROW = 'cursor-pointer whitespace-nowrap';

export function RemoveTaskFromPlan({
	task,
	plan,
	member
}: {
	task: TTask;
	member?: TOrganizationTeamEmployee;
	plan?: TDailyPlan;
}) {
	const t = useTranslations();
	const { removeTaskFromPlan } = useUpdateDailyPlan();
	const data: IDailyPlanTasksUpdate = {
		taskId: task.id,
		employeeId: member?.employeeId ?? undefined
	};
	const onClick = () => {
		removeTaskFromPlan(data, plan?.id ?? '');
	};
	return (
		<DropdownMenuItem variant="destructive" className={REMOVE_FROM_PLAN_ROW} onSelect={onClick}>
			<Trash />
			{t('dailyPlan.REMOVE_FROM_THIS_PLAN')}
		</DropdownMenuItem>
	);
}

export function RemoveManyTaskFromPlan({ task, member }: { task: TTask; member?: TOrganizationTeamEmployee }) {
	const t = useTranslations();
	const { removeManyTaskPlans } = useUpdateDailyPlan();
	const data: IRemoveTaskFromManyPlansRequest = {
		plansIds: [],
		employeeId: member?.employeeId ?? ''
	};
	const onClick = () => {
		removeManyTaskPlans(data, task.id ?? '');
	};
	return (
		<DropdownMenuItem variant="destructive" className={REMOVE_FROM_PLAN_ROW} onSelect={onClick}>
			<Trash />
			{t('dailyPlan.REMOVE_FROM_ALL_PLANS')}
		</DropdownMenuItem>
	);
}
