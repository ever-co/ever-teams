'use client';
import { secondsToTime, tomorrowDate } from '@/core/lib/helpers/index';
import {
	I_TeamMemberCardHook,
	I_UserProfilePage,
	useCanSeeActivityScreen,
	useDailyPlan,
	useModal,
	useTMCardTaskEdit,
	useTaskStatistics,
	useTeamMemberCard
} from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { EDailyPlanStatus, EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import {
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { activeTeamState, activeTeamTaskState, timerSecondsState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator
} from '@/core/components/common/dropdown-menu';
import { SpinnerLoader, Text } from '@/core/components';
import Link from 'next/link';
import React, { useCallback, useMemo, useState, useTransition } from 'react';
import { SetStateAction, useAtomValue } from 'jotai';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { TaskAvatars } from './task-items';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';
import { useTranslations } from 'next-intl';
import { SixSquareGridIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { CreateDailyPlanFormModal } from '../features/daily-plan/create-daily-plan-form-modal';
import { ReloadIcon } from '@radix-ui/react-icons';
import moment from 'moment';
import { AddTasksEstimationHoursModal, EnforcePlanedTaskModal, SuggestDailyPlanModal } from '../daily-plan';
import { Nullable, SetAtom } from '@/core/types/generics';
import { TaskEstimateInfo } from '../pages/teams/team/team-members-views/user-team-card/task-estimate';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';
import { AddTaskToPlan } from '../features/daily-plan/add-task-to-plan';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { toast } from 'sonner';
import { TDailyPlan, TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { useTimerButtonLogic } from '@/core/hooks/tasks/use-timer-button';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { LoaderCircle } from 'lucide-react';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { sortedPlansState } from '@/core/stores';

type Props = {
	active?: boolean;
	task?: Nullable<TTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	editTaskId?: string | null;
	setEditTaskId?: SetAtom<[SetStateAction<string | null>], void>;
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
	plan?: TDailyPlan;
	planMode?: FilterTabs;
	taskContentClassName?: string;
} & IClassName;

type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

// Memoize TaskCard to prevent unnecessary re-renders
export const TaskCard = React.memo(function TaskCard(props: Props) {
	const {
		active,
		className,
		task,
		isAuthUser,
		activeAuthTask,
		viewType = 'default',
		profile,
		taskBadgeClassName,
		taskTitleClassName,
		taskContentClassName,
		plan,
		planMode
	} = props;
	const t = useTranslations();
	const [loading, setLoading] = useState(false);
	// Only get timer state for active auth task to prevent unnecessary re-renders
	const seconds = useAtomValue(timerSecondsState);
	const { activeTaskDailyStat, activeTaskTotalStat, addSeconds } = useTaskStatistics(
		isAuthUser && activeAuthTask ? seconds : 0
	);

	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);

	const isTrackingEnabled = useMemo(
		() => !!activeTeam?.members?.find((member) => member.employee?.userId === user?.id && member.isTrackingEnabled),
		[activeTeam?.members, user?.id]
	);
	const members = activeTeam?.members || [];
	const currentMember = members.find((m) => m.employee?.user?.id === profile?.userProfile?.id);

	const { hours: h, minutes: m } = secondsToTime((activeTaskTotalStat?.duration || 0) + addSeconds);
	const totalWork = useMemo(
		() =>
			isAuthUser && activeAuthTask ? (
				<div className={clsxm('flex items-center space-x-2 font-normal')}>
					<span className="text-gray-500 lg:text-sm">{t('pages.taskDetails.TOTAL_TIME')}:</span>
					<Text>
						{h}h : {m}m
					</Text>
				</div>
			) : (
				<></>
			),
		[activeAuthTask, h, isAuthUser, m, t]
	);
	// Daily work
	const { hours: dh, minutes: dm } = useMemo(
		() => secondsToTime((activeTaskDailyStat?.duration || 0) + addSeconds),
		[activeTaskDailyStat?.duration, addSeconds]
	);
	const todayWork = useMemo(
		() =>
			isAuthUser && activeAuthTask ? (
				<div className={clsxm('flex flex-col items-start font-normal')}>
					<span className="text-xs text-gray-500">{t('common.TOTAL_WORK')}</span>
					<Text>
						{dh}h : {dm}m
					</Text>
				</div>
			) : (
				<></>
			),
		[activeAuthTask, dh, dm, isAuthUser, t]
	);
	const memberInfo = useTeamMemberCard(currentMember || undefined);
	const taskEdition = useTMCardTaskEdit(task);
	const activeMembers = useMemo(() => ((task != null && task?.members?.length) || 0) > 0, [task]);
	const hasMembers = useMemo(() => task?.members && task?.members?.length > 0, [task?.members]);
	const taskAssignee: ImageOverlapperProps[] = useMemo(
		() =>
			task?.members?.map((member: any) => {
				return {
					id: member.user?.id,
					url: member.user?.imageUrl,
					alt: member.user?.firstName
				};
			}) || [],
		[task?.members]
	);
	return (
		<>
			<EverCard
				shadow="bigger"
				className={clsxm(
					'lg:flex items-center justify-between py-3 px-4 md:px-4 hidden h-[7rem] dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D] relative',
					active && ['border-primary-light dark:bg-[#1E2025]'],
					'xl:gap-5 gap-2',
					className
				)}
			>
				<div className="absolute -left-0">
					<SixSquareGridIcon className="w-6 h-6 text-[#CCCCCC] dark:text-[#4F5662]" />
				</div>

				<div
					className={clsxm(
						'flex flex-row flex-1 justify-between min-w-[12rem] max-w-[22rem]',
						taskContentClassName
					)}
				>
					{/* Task information */}
					<TaskInfo
						task={task}
						className="px-4 w-full"
						taskBadgeClassName={clsxm(taskBadgeClassName)}
						taskTitleClassName={clsxm(taskTitleClassName)}
						dayPlanTab={planMode}
						tab={viewType}
					/>
				</div>
				<VerticalSeparator />
				{(viewType === 'default' || viewType === 'dailyplan') && (
					<>
						{/* TaskEstimateInfo */}
						<div className="flex items-center flex-col justify-center lg:flex-row w-[20%]">
							<TaskEstimateInfo
								plan={plan}
								memberInfo={memberInfo}
								edition={taskEdition}
								activeAuthTask={true}
							/>
						</div>
					</>
				)}

				{viewType === 'unassign' && (
					<div className="w-[20%] flex justify-around items-center">
						<UsersTaskAssigned task={task} />
						<ImageComponent
							radius={40}
							images={taskAssignee}
							item={task}
							hasActiveMembers={activeMembers}
							hasInfo={!hasMembers ? 'Assign this task' : 'Assign this task to more people'}
						/>
					</div>
				)}
				<VerticalSeparator />

				{/* TaskTimes */}
				<div className="flex items-center justify-between gap-[1.125rem] min-w-fit px-5 w-max lg:px-3 2xl:max-w-52 3xl:max-w-72">
					<TaskTimes
						activeAuthTask={activeAuthTask}
						task={task}
						isAuthUser={isAuthUser}
						className="flex flex-col gap-2"
						showTotal={viewType !== 'unassign'}
						memberInfo={memberInfo}
					/>
					{isTrackingEnabled && isAuthUser && task && (
						<TimerButtonCall
							activeTeam={activeTeam}
							currentMember={currentMember}
							task={task}
							className="w-11 h-11"
						/>
					)}
				</div>
				<VerticalSeparator />

				<div className="flex justify-center items-center w-1/5 h-full min-w-fit xl:justify-between lg:px-3 2xl:max-w-52 3xl:max-w-72">
					{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
					<div className="flex justify-center items-center">
						<ActiveTaskStatusDropdown
							task={task}
							onChangeLoading={(load: boolean) => setLoading(load)}
							className="min-w-[10.625rem] text-sm"
						/>
					</div>
					{/* TaskCardMenu */}
					<div className="flex justify-end items-end mt-2 shrink-0 xl:mt-0 text-start">
						{task && currentMember && (
							<TaskCardMenu
								task={task}
								loading={loading}
								memberInfo={memberInfo}
								viewType={viewType}
								profile={profile}
								plan={plan}
								planMode={planMode}
							/>
						)}
					</div>
				</div>
			</EverCard>

			{/* Small screen size */}
			<EverCard
				shadow="bigger"
				className={clsxm(
					'relative lg:hidden flex justify-between py-3 flex-col',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				<div className="flex justify-between mb-4 ml-2">
					{totalWork}
					{/* {isTrackingEnabled && isAuthUser && viewType === 'unassign' && task && (
						<TimerButtonCall activeTeam={activeTeam} currentMember={currentMember} task={task} />
					)} */}
				</div>
				<div className="flex flex-wrap justify-between items-start pb-4 border-b">
					<TaskInfo task={task} className="px-4 mb-4 w-full" tab={viewType} dayPlanTab={planMode} />{' '}
					{viewType === 'default' && (
						<>
							<div className="flex items-end py-4 mx-auto space-x-2">
								<TaskEstimateInfo
									memberInfo={memberInfo}
									edition={taskEdition}
									activeAuthTask={true}
									className="px-3 w-52"
								/>
							</div>
						</>
					)}
				</div>

				{viewType === 'unassign' && (
					<>
						<UsersTaskAssigned className="px-3 py-4 mx-auto w-full" task={task} />
					</>
				)}
				<div className="flex justify-between items-center mt-4 mb-4 space-x-5">
					<div className="flex space-x-4">
						{todayWork}
						{isTrackingEnabled && isAuthUser && task && (
							<TimerButtonCall activeTeam={activeTeam} currentMember={currentMember} task={task} />
						)}
					</div>
					<ActiveTaskStatusDropdown
						task={task || null}
						onChangeLoading={(loadState: boolean) => setLoading(loadState)}
					/>
					{task && currentMember && (
						<TaskCardMenu
							task={task}
							loading={loading}
							memberInfo={memberInfo}
							viewType={viewType}
							plan={plan}
						/>
					)}
				</div>
			</EverCard>
		</>
	);
});

// Memorize UsersTaskAssigned to prevent unnecessary re-renders
const UsersTaskAssigned = React.memo(({ task, className }: { task: Nullable<TTask> } & IClassName) => {
	const t = useTranslations();
	const members = task?.members || [];

	return (
		<div className={clsxm('flex justify-center items-center', className)}>
			<div className="flex flex-col justify-center items-center">
				{members.length > 0 && <span className="mb-1 text-xs text-center">{t('common.ASSIGNED')}</span>}
				<span className="text-sm font-medium text-center">
					{members.length > 0
						? `${members.length} ${t('common.PEOPLE')}`
						: t('task.tabFilter.NO_TASK_USER_ASSIGNED')}
				</span>
			</div>
			{members.length > 0 && task && <TaskAvatars task={task} limit={3} />}
		</div>
	);
});

// Memoized TimerButtonCall component
const TimerButtonCall = React.memo(
	({
		task,
		currentMember,
		activeTeam,
		className
	}: {
		task: TTask;
		currentMember: TOrganizationTeamEmployee | undefined;
		activeTeam: TOrganizationTeam | null;
		className?: string;
	}) => {
		const activeTeamTask = useAtomValue(activeTeamTaskState);

		const {
			loading,
			activeTaskStatus,
			requirePlan,
			startTimerWithTask,
			modals,
			startStopTimerHandler,
			canTrack,
			disabled,
			hasPlan,
			startTimer,
			t
		} = useTimerButtonLogic({ task, currentMember, activeTeam });

		return loading ? (
			<SpinnerLoader size={30} />
		) : (
			<>
				<TimerButton
					onClick={activeTaskStatus ? startStopTimerHandler : startTimerWithTask}
					running={activeTaskStatus?.running}
					disabled={activeTaskStatus ? disabled : task.status === 'closed' || !canTrack}
					className={clsxm('w-14 h-14', className)}
				/>

				<SuggestDailyPlanModal
					isOpen={modals.isSuggestDailyPlanModalOpen}
					closeModal={modals.suggestDailyPlanCloseModal}
				/>

				{/**
				 * Track time on planned task (SOFT FLOW)
				 */}
				{hasPlan && activeTeamTask && (
					<EnforcePlanedTaskModal
						content={`Would you like to add the task "${activeTeamTask.taskNumber}" to Today's plan?`}
						closeModal={modals.enforceTaskSoftCloseModal}
						plan={hasPlan}
						open={modals.isEnforceTaskSoftModalOpen}
						task={activeTeamTask}
					/>
				)}

				{hasPlan && hasPlan.tasks && (
					<AddTasksEstimationHoursModal
						isOpen={modals.isTasksEstimationHoursModalOpen}
						closeModal={modals.tasksEstimationHoursCloseModal}
						plan={hasPlan}
						tasks={hasPlan.tasks}
					/>
				)}

				{/**
				 * Track time on planned task (REQUIRE PLAN)
				 */}
				{requirePlan && hasPlan && activeTeamTask && (
					<EnforcePlanedTaskModal
						onOK={startTimer}
						content={t('dailyPlan.SUGGESTS_TO_ADD_TASK_TO_TODAY_PLAN')}
						closeModal={modals.enforceTaskCloseModal}
						plan={hasPlan}
						open={modals.isEnforceTaskModalOpen}
						task={activeTeamTask}
						openDailyPlanModal={modals.openAddTasksEstimationHoursModal}
					/>
				)}
			</>
		);
	}
);

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
			<div className={clsxm('h-full flex flex-col items-start justify-between gap-[1.0625rem]', className)}>
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
								<Link href={`/task/${task?.id}`} className="absolute inset-0 opacity-0" />
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
/**
 * It's a dropdown menu that allows the user to remove the task.
 */
export function TaskCardMenu({
	task,
	loading,
	memberInfo,
	viewType,
	profile,
	plan,
	planMode
}: {
	task: TTask;
	loading?: boolean;
	memberInfo?: I_TeamMemberCardHook;
	viewType: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	plan?: TDailyPlan;
	planMode?: FilterTabs;
}) {
	const t = useTranslations();

	const { toggleFavoriteTask, isFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();

	const handleAssignment = useCallback(() => {
		if (viewType === 'unassign') {
			memberInfo?.assignTask(task);
		} else {
			memberInfo?.unassignTask(task);
		}
	}, [memberInfo, task, viewType, t]);

	const canSeeActivity = useCanSeeActivityScreen();

	const { todayPlan, futurePlans } = useDailyPlan();

	const taskPlannedToday = useMemo(
		() => todayPlan[todayPlan.length - 1]?.tasks?.find((planTask) => planTask.id === task.id),
		[task.id, todayPlan]
	);

	const allPlans = [...todayPlan, ...futurePlans];
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
				.filter((_plan) =>
					moment(_plan.date)
						.format('YYYY-MM-DD')
						?.toString()
						?.startsWith(moment()?.add(1, 'day').format('YYYY-MM-DD'))
				)[0]
				?.tasks?.find((planTask) => planTask.id === task.id),
		[futurePlans, task.id]
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center border-none outline-none">
					{!loading && <ThreeCircleOutlineVerticalIcon className="w-6 max-w-[24px] dark:text-[#B1AEBC]" />}
					{loading && <SpinnerLoader size={20} />}
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="z-50 min-w-[110px] w-[11rem] shadow-xl border bg-white dark:bg-dark--theme-light p-3"
			>
				<DropdownMenuItem
					className="p-0 mb-2 font-normal hover:!bg-transparent duration-300 hover:font-semibold transition-all"
					asChild
				>
					<Link href={`/task/${task.id}`} className={clsxm('w-full whitespace-nowrap')}>
						{t('common.TASK_DETAILS')}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="p-0 mb-2 transition-all duration-300 hover:font-semibold hover:!bg-transparent cursor-pointer font-normal"
					onSelect={() => toggleFavoriteTask(task)}
				>
					<span className={clsxm('w-full whitespace-nowrap')}>
						{addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading ? (
							<LoaderCircle size={15} className="animate-spin" />
						) : isFavoriteTask(task.id) ? (
							t('common.REMOVE_FAVORITE_TASK')
						) : (
							t('common.ADD_FAVORITE_TASK')
						)}
					</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="p-0 mb-3 transition-all duration-300 hover:font-semibold hover:!bg-transparent cursor-pointer font-normal"
					onSelect={handleAssignment}
				>
					<span className={clsxm('w-full whitespace-nowrap')}>
						{viewType === 'unassign' ? t('common.ASSIGN_TASK') : t('common.UNASSIGN_TASK')}
					</span>
				</DropdownMenuItem>

				{(viewType == 'default' || (viewType === 'dailyplan' && planMode === 'Outstanding')) && (
					<>
						<DropdownMenuSeparator className="my-3" />
						<div className="mt-3">
							{!taskPlannedToday && (
								<DropdownMenuItem className="p-0 mb-2 transition-all duration-300 hover:font-semibold hover:!bg-transparent">
									<PlanTask
										planMode={EDailyPlanMode['TODAY']}
										taskId={task.id}
										employeeId={profile?.member?.employeeId ?? ''}
										taskPlannedToday={taskPlannedToday}
									/>
								</DropdownMenuItem>
							)}
							{!taskPlannedTomorrow && (
								<DropdownMenuItem className="p-0 mb-2 transition-all duration-300 hover:font-semibold  hover:!bg-transparent">
									<PlanTask
										planMode={EDailyPlanMode['TOMORROW']}
										taskId={task.id}
										employeeId={profile?.member?.employeeId ?? ''}
										taskPlannedForTomorrow={taskPlannedTomorrow}
									/>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem className="p-0 mb-2 transition-all duration-300 hover:font-semibold  hover:!bg-transparent">
								<PlanTask
									planMode={EDailyPlanMode['CUSTOM']}
									taskId={task.id}
									employeeId={profile?.member?.employeeId ?? ''}
								/>
							</DropdownMenuItem>
						</div>
					</>
				)}

				{viewType === 'dailyplan' && (planMode === 'Today Tasks' || planMode === 'Future Tasks') && (
					<>
						{canSeeActivity ? (
							<div>
								<DropdownMenuSeparator className="my-2" />
								<DropdownMenuItem className="p-0 mt-2 transition-all duration-300 hover:font-semibold  hover:!bg-transparent">
									<RemoveTaskFromPlan member={profile?.member} task={task} plan={plan} />
								</DropdownMenuItem>
								{isTaskPlannedMultipleTimes && (
									<DropdownMenuItem className="p-0 mt-2 transition-all duration-300 hover:font-semibold  hover:!bg-transparent">
										<RemoveManyTaskFromPlan task={task} member={profile?.member} />
									</DropdownMenuItem>
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
		</DropdownMenu>
	);
}

export function PlanTask({
	planMode,
	taskId,
	employeeId,
	chooseMember,
	taskPlannedToday,
	taskPlannedForTomorrow
}: {
	taskId: string;
	planMode: EDailyPlanMode;
	employeeId?: string;
	chooseMember?: boolean;
	taskPlannedToday?: TTask;
	taskPlannedForTomorrow?: TTask;
}) {
	const t = useTranslations();
	const [isPending, startTransition] = useTransition();
	const { closeModal, isOpen, openModal } = useModal();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	const { data: user } = useUserQuery();

	const handleOpenModal = async () => {
		try {
			if (planMode === 'custom') {
				openModal();
				// Note: Toast for custom plan will be shown when the plan is actually created in the modal
			} else if (planMode === 'today') {
				startTransition(async () => {
					try {
						await createDailyPlan({
							workTimePlanned: 0,
							taskId,
							date: String(new Date()),
							status: EDailyPlanStatus.OPEN,
							tenantId: user?.tenantId ?? '',
							employeeId: employeeId,
							organizationId: user?.employee?.organizationId
						});
						toast.success(t('task.toastMessages.TASK_PLANNED_FOR_TODAY'), {
							id: 'task-planned-for-today'
						});
					} catch (error) {
						console.error('Plan creation error:', error);
						toast.error(t('task.toastMessages.TASK_PLAN_FAILED'), {
							id: 'task-plan-failed'
						});
					}
				});
			} else {
				startTransition(async () => {
					try {
						await createDailyPlan({
							workTimePlanned: 0,
							taskId,
							date: String(tomorrowDate),
							status: EDailyPlanStatus.OPEN,
							tenantId: user?.tenantId ?? '',
							employeeId: employeeId,
							organizationId: user?.employee?.organizationId
						});
						toast.success(t('task.toastMessages.TASK_PLANNED_FOR_TOMORROW'), {
							id: 'task-planned-for-tomorrow'
						});
					} catch (error) {
						console.error('Plan creation error:', error);
						toast.error(t('task.toastMessages.TASK_PLAN_FAILED'), {
							id: 'task-plan-failed'
						});
					}
				});
			}
		} catch (error) {
			console.error('Plan modal error:', error);
			toast.error(t('task.toastMessages.TASK_PLAN_FAILED'));
		}
	};

	return (
		<div>
			<CreateDailyPlanFormModal
				open={isOpen}
				closeModal={closeModal}
				taskId={taskId}
				planMode={planMode}
				employeeId={employeeId}
				chooseMember={chooseMember}
			/>
			<button
				className={clsxm(
					'font-normal whitespace-nowrap transition-all',
					'h-auto cursor-pointer hover:font-semibold'
				)}
				onClick={handleOpenModal}
				disabled={planMode === 'today' && createDailyPlanLoading}
			>
				{planMode === 'today' && !taskPlannedToday && (
					<span className="">
						{isPending || createDailyPlanLoading ? (
							<ReloadIcon className="mr-2 w-4 h-4 animate-spin" />
						) : (
							t('dailyPlan.PLAN_FOR_TODAY')
						)}
					</span>
				)}
				{planMode === 'tomorrow' && !taskPlannedForTomorrow && (
					<span>
						{isPending || createDailyPlanLoading ? (
							<ReloadIcon className="mr-2 w-4 h-4 animate-spin" />
						) : (
							t('dailyPlan.PLAN_FOR_TOMORROW')
						)}
					</span>
				)}
				{planMode === 'custom' && t('dailyPlan.PLAN_FOR_SOME_DAY')}
			</button>
		</div>
	);
}

export function AddTaskToPlanComponent({ task, employee }: { task: TTask; employee?: IEmployee }) {
	const t = useTranslations();
	const { closeModal, isOpen, openModal } = useModal();
	return (
		<span
			className={clsxm('font-normal whitespace-nowrap transition-all', 'cursor-pointer hover:font-semibold')}
			onClick={openModal}
		>
			<AddTaskToPlan closeModal={closeModal} open={isOpen} task={task} employee={employee} />
			{t('dailyPlan.ADD_TASK_TO_PLAN')}
		</span>
	);
}

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
	const { removeTaskFromPlan } = useDailyPlan();
	const data: IDailyPlanTasksUpdate = {
		taskId: task.id,
		employeeId: member?.employeeId ?? undefined
	};
	const onClick = () => {
		removeTaskFromPlan(data, plan?.id ?? '');
	};
	return (
		<span
			className={clsxm(
				'font-normal text-red-600 whitespace-nowrap transition-all',
				'cursor-pointer hover:font-semibold'
			)}
			onClick={onClick}
		>
			{t('dailyPlan.REMOVE_FROM_THIS_PLAN')}
		</span>
	);
}

export function RemoveManyTaskFromPlan({ task, member }: { task: TTask; member?: TOrganizationTeamEmployee }) {
	// const t = useTranslations();
	const { removeManyTaskPlans } = useDailyPlan();
	const data: IRemoveTaskFromManyPlansRequest = {
		plansIds: [],
		employeeId: member?.employeeId ?? ''
	};
	const onClick = () => {
		removeManyTaskPlans(data, task.id ?? '');
	};
	return (
		<span
			className={clsxm(
				'font-normal text-red-600 whitespace-nowrap transition-all',
				'cursor-pointer hover:font-semibold'
			)}
			onClick={onClick}
		>
			Remove from all plans
		</span>
	);
}
