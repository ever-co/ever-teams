'use client';

import { secondsToTime, tomorrowDate } from '@app/helpers';
import {
	I_TeamMemberCardHook,
	I_UserProfilePage,
	useAuthenticateUser,
	useCanSeeActivityScreen,
	useDailyPlan,
	useModal,
	useOrganizationEmployeeTeams,
	useOrganizationTeams,
	useTMCardTaskEdit,
	useTaskStatistics,
	useTeamMemberCard,
	useTeamTasks,
	useTimerView
} from '@app/hooks';
import ImageComponent, { ImageOverlapperProps } from 'lib/components/image-overlapper';
import {
	DailyPlanStatusEnum,
	IClassName,
	IDailyPlan,
	IDailyPlanMode,
	IDailyPlanTasksUpdate,
	IOrganizationTeamList,
	IRemoveTaskFromManyPlans,
	ITeamTask,
	Nullable,
	OT_Member
} from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import {
	Card,
	Divider,
	// ConfirmDropdown,
	SpinnerLoader,
	Text,
	VerticalSeparator
} from 'lib/components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { SetStateAction, useAtomValue } from 'jotai';
import { TaskEstimateInfo } from '../team/user-team-card/task-estimate';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { TaskAvatars } from './task-item';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';
import { useTranslations } from 'next-intl';
import { SixSquareGridIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { CreateDailyPlanFormModal } from '../daily-plan/create-daily-plan-form-modal';
import { AddTaskToPlan } from '../daily-plan/add-task-to-plan';
import { ReloadIcon } from '@radix-ui/react-icons';
import moment from 'moment';
import { useStartStopTimerHandler } from '@app/hooks/features/useStartStopTimerHandler';
import {
	AddDailyPlanWorkHourModal,
	AddTasksEstimationHoursModal,
	EnforcePlanedTaskModal,
	SuggestDailyPlanModal
} from '../daily-plan';
import { SetAtom } from 'types';
import { useFavoritesTask } from '@/app/hooks/features/useFavoritesTask';

type Props = {
	active?: boolean;
	task?: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	editTaskId?: string | null;
	setEditTaskId?: SetAtom<[SetStateAction<string | null>], void>;
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
	plan?: IDailyPlan;
	planMode?: FilterTabs;
} & IClassName;

type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export function TaskCard(props: Props) {
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
		plan,
		planMode
	} = props;
	const t = useTranslations();
	const [loading, setLoading] = useState(false);
	const seconds = useAtomValue(timerSecondsState);
	const { activeTaskDailyStat, activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentMember = useMemo(
		() =>
			members.find((m) => {
				return m.employee.user?.id === profile?.userProfile?.id;
			}),
		[members, profile?.userProfile?.id]
	);

	const { h, m } = secondsToTime((activeTaskTotalStat?.duration || 0) + addSeconds);
	const totalWork = useMemo(
		() =>
			isAuthUser && activeAuthTask ? (
				<div className={clsxm('flex space-x-2 items-center font-normal')}>
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
	const { h: dh, m: dm } = useMemo(
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
	const activeMembers = useMemo(() => task != null && task?.members?.length > 0, [task]);
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
			<Card
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

				<div className="flex-1 min-w-[12rem] max-w-[40%] flex flex-row justify-between">
					{/* Task information */}
					<TaskInfo
						task={task}
						className="w-full px-4"
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
				<div className="flex items-center justify-between gap-[1.125rem]  px-5 w-1/5 lg:px-3 2xl:w-52 3xl:w-72">
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

				<div className="flex items-center justify-center w-1/5 h-full xl:justify-between lg:px-3 2xl:w-52 3xl:w-80">
					{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
					<div className="flex items-center justify-center ">
						<ActiveTaskStatusDropdown
							task={task}
							onChangeLoading={(load) => setLoading(load)}
							className="min-w-[10.625rem] text-sm"
						/>
					</div>
					{/* TaskCardMenu */}
					<div className="flex items-end justify-end mt-2 shrink-0 xl:mt-0 text-start">
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
			</Card>

			{/* Small screen size */}
			<Card
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
				<div className="flex flex-wrap items-start justify-between pb-4 border-b">
					<TaskInfo task={task} className="w-full px-4 mb-4" tab={viewType} dayPlanTab={planMode} />{' '}
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
						<UsersTaskAssigned className="w-full px-3 py-4 mx-auto" task={task} />
					</>
				)}
				<div className="flex items-center justify-between mt-4 mb-4 space-x-5">
					<div className="flex space-x-4">
						{todayWork}
						{isTrackingEnabled && isAuthUser && task && (
							<TimerButtonCall activeTeam={activeTeam} currentMember={currentMember} task={task} />
						)}
					</div>
					<ActiveTaskStatusDropdown task={task || null} onChangeLoading={(load) => setLoading(load)} />
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
			</Card>
		</>
	);
}

function UsersTaskAssigned({ task, className }: { task: Nullable<ITeamTask> } & IClassName) {
	const t = useTranslations();
	const members = useMemo(() => task?.members || [], [task?.members]);

	return (
		<div className={clsxm('flex justify-center items-center', className)}>
			<div className="flex flex-col items-center justify-center">
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
}

/**
 * "If the task is the active task, then use the timer handler, otherwise start the timer with the
 * task."
 *
 * The function is a bit more complicated than that, but that's the gist of it
 * @param  - `task` - the task that the timer button is for
 * @returns A TimerButton component that is either a spinner or a timer button.
 */
function TimerButtonCall({
	task,
	currentMember,
	activeTeam,
	className
}: {
	task: ITeamTask;
	currentMember: OT_Member | undefined;
	activeTeam: IOrganizationTeamList | null;
	className?: string;
}) {
	const [loading, setLoading] = useState(false);
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();

	const { canTrack, disabled, timerStatus, activeTeamTask, startTimer, stopTimer, hasPlan } = useTimerView();

	const { setActiveTask } = useTeamTasks();

	const activeTaskStatus = useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const t = useTranslations();

	/* It's a function that is called when the timer button is clicked. */
	const startTimerWithTask = useCallback(async () => {
		if (task.status === 'closed') return;

		if (timerStatus?.running) {
			setLoading(true);
			await stopTimer().finally(() => setLoading(false));
		}

		setActiveTask(task);

		// Update Current user's active task to sync across multiple devices
		const currentEmployeeDetails = activeTeam?.members.find((member) => member.id === currentMember?.id);
		if (currentEmployeeDetails && currentEmployeeDetails.id) {
			updateOrganizationTeamEmployee(currentEmployeeDetails.id, {
				organizationId: task.organizationId,
				activeTaskId: task.id,
				organizationTeamId: activeTeam?.id,
				tenantId: activeTeam?.tenantId
			});
		}

		window.setTimeout(startTimer, 100);

		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, [
		task,
		timerStatus?.running,
		setActiveTask,
		activeTeam,
		startTimer,
		stopTimer,
		currentMember?.id,
		updateOrganizationTeamEmployee
	]);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler();

	return loading ? (
		<SpinnerLoader size={30} />
	) : (
		<>
			<TimerButton
				onClick={activeTaskStatus ? startStopTimerHandler : startTimerWithTask}
				running={activeTaskStatus?.running}
				disabled={activeTaskStatus ? disabled : task.status === 'closed' || !canTrack}
				className={clsxm('h-14 w-14', className)}
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

			{hasPlan && (
				<AddDailyPlanWorkHourModal
					isOpen={modals.isDailyPlanWorkHoursModalOpen}
					closeModal={modals.dailyPlanWorkHoursCloseModal}
					plan={hasPlan}
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

//* Task Estimate info *
//* Task Info FC *
export function TaskInfo({
	className,
	task,
	taskBadgeClassName,
	taskTitleClassName,
	tab,
	dayPlanTab
}: IClassName & {
	tab: 'default' | 'unassign' | 'dailyplan';
	dayPlanTab?: FilterTabs;
	task?: Nullable<ITeamTask>;
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
}) {
	const router = useRouter();

	return (
		<div className={clsxm('h-full flex flex-col items-start justify-between gap-[1.0625rem]', className)}>
			{/* task */}
			{!task && <div className="self-center py-1 text-center">--</div>}
			{task && (
				<div className="w-full h-10 overflow-hidden">
					<div className={clsxm('h-full flex flex-col items-start justify-start')}>
						<div
							className={clsxm('text-sm text-ellipsis overflow-hidden w-full cursor-pointer')}
							onClick={() => task && router.push(`/task/${task?.id}`)}
						>
							<TaskNameInfoDisplay
								task={task}
								className={clsxm(taskBadgeClassName)}
								taskTitleClassName={clsxm(taskTitleClassName)}
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
	task: ITeamTask;
	loading?: boolean;
	memberInfo?: I_TeamMemberCardHook;
	viewType: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	plan?: IDailyPlan;
	planMode?: FilterTabs;
}) {
	const t = useTranslations();

	const { toggleFavorite, isFavorite } = useFavoritesTask();
	const handleAssignment = useCallback(() => {
		if (viewType === 'unassign') {
			memberInfo?.assignTask(task);
		} else {
			memberInfo?.unassignTask(task);
		}
	}, [memberInfo, task, viewType]);

	const canSeeActivity = useCanSeeActivityScreen();
	const { todayPlan, futurePlans } = useDailyPlan();

	const taskPlannedToday = useMemo(
		() => todayPlan[todayPlan.length - 1]?.tasks?.find((_task) => _task.id === task.id),
		[task.id, todayPlan]
	);

	const allPlans = [...todayPlan, ...futurePlans];
	const isTaskPlannedMultipleTimes =
		allPlans.reduce((count, plan) => {
			if (plan?.tasks) {
				const taskCount = plan.tasks.filter((_task) => _task.id === task.id).length;
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
				?.tasks?.find((_task) => _task.id === task.id),
		[futurePlans, task.id]
	);

	return (
		<Popover>
			<Popover.Button className="flex items-center border-none outline-none">
				{!loading && <ThreeCircleOutlineVerticalIcon className="w-6 max-w-[24px]  dark:text-[#B1AEBC]" />}
				{loading && <SpinnerLoader size={20} />}
			</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-0 min-w-[110px]"
			>
				<Popover.Panel>
					{() => {
						return (
							<Card shadow="custom" className="shadow-xlcard !py-3 !px-7">
								<ul className="min-w-[124px]">
									<li className="mb-2">
										<Link
											href={`/task/${task.id}`}
											className={clsxm(
												'font-normal whitespace-nowrap transition-all',
												'hover:font-semibold hover:transition-all'
											)}
										>
											{t('common.TASK_DETAILS')}
										</Link>
									</li>
									<li className="mb-2">
										<span
											onClick={() => toggleFavorite(task)}
											className={clsxm(
												'font-normal whitespace-nowrap transition-all',
												'hover:font-semibold hover:transition-all'
											)}
										>
											{isFavorite(task)
												? t('common.REMOVE_FAVORITE_TASK')
												: t('common.ADD_FAVORITE_TASK')}
										</span>
									</li>
									<li className="mb-3">
										<span
											className={clsxm(
												'font-normal whitespace-nowrap transition-all',
												'hover:font-semibold hover:transition-all cursor-pointer'
											)}
											onClick={handleAssignment}
										>
											{viewType === 'unassign'
												? t('common.ASSIGN_TASK')
												: t('common.UNASSIGN_TASK')}
										</span>
									</li>

									{(viewType == 'default' ||
										(viewType === 'dailyplan' && planMode === 'Outstanding')) && (
										<>
											<Divider type="HORIZONTAL" />
											<div className="mt-3">
												{!taskPlannedToday && (
													<li className="mb-2">
														<PlanTask
															planMode="today"
															taskId={task.id}
															employeeId={profile?.member?.employeeId ?? ''}
															taskPlannedToday={taskPlannedToday}
														/>
													</li>
												)}
												{!taskPlannedTomorrow && (
													<li className="mb-2">
														<PlanTask
															planMode="tomorow"
															taskId={task.id}
															employeeId={profile?.member?.employeeId ?? ''}
															taskPlannedForTomorrow={taskPlannedTomorrow}
														/>
													</li>
												)}
												<li className="mb-2">
													<PlanTask
														planMode="custom"
														taskId={task.id}
														employeeId={profile?.member?.employeeId ?? ''}
													/>
												</li>
											</div>
										</>
									)}

									{viewType === 'dailyplan' &&
										(planMode === 'Today Tasks' || planMode === 'Future Tasks') && (
											<>
												{canSeeActivity ? (
													<div>
														<Divider type="HORIZONTAL" />
														<div className="mt-2">
															<RemoveTaskFromPlan
																member={profile?.member}
																task={task}
																plan={plan}
															/>
														</div>
														{isTaskPlannedMultipleTimes && (
															<div className="mt-2">
																<RemoveManyTaskFromPlan
																	task={task}
																	member={profile?.member}
																/>
															</div>
														)}
													</div>
												) : (
													<></>
												)}
											</>
										)}
									{/* <li>
										<ConfirmDropdown
											className="right-[110%] top-0"
											onConfirm={() => {
												console.log('remove task...', task);
											}}
										>
											<Text
												className={clsxm(
													'font-normal whitespace-nowrap hover:font-semibold hover:transition-all',
													'text-red-500'
												)}
											>
												{t('common.REMOVE')}
											</Text>
										</ConfirmDropdown>
									</li> */}
								</ul>
							</Card>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
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
	planMode: IDailyPlanMode;
	employeeId?: string;
	chooseMember?: boolean;
	taskPlannedToday?: ITeamTask;
	taskPlannedForTomorrow?: ITeamTask;
}) {
	const t = useTranslations();
	const [isPending, startTransition] = useTransition();
	const { closeModal, isOpen, openModal } = useModal();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	const { user } = useAuthenticateUser();

	const handleOpenModal = () => {
		if (planMode === 'custom') {
			openModal();
		} else if (planMode === 'today') {
			startTransition(() => {
				createDailyPlan({
					workTimePlanned: 0,
					taskId,
					date: new Date(),
					status: DailyPlanStatusEnum.OPEN,
					tenantId: user?.tenantId ?? '',
					employeeId: employeeId,
					organizationId: user?.employee.organizationId
				});
			});
		} else {
			startTransition(() => {
				createDailyPlan({
					workTimePlanned: 0,
					taskId,
					date: tomorrowDate,
					status: DailyPlanStatusEnum.OPEN,
					tenantId: user?.tenantId ?? '',
					employeeId: employeeId,
					organizationId: user?.employee.organizationId
				});
			});
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
					'hover:font-semibold hover:transition-all cursor-pointer h-auto'
				)}
				onClick={handleOpenModal}
				disabled={planMode === 'today' && createDailyPlanLoading}
			>
				{planMode === 'today' && !taskPlannedToday && (
					<span className="">
						{isPending || createDailyPlanLoading ? (
							<ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
						) : (
							t('dailyPlan.PLAN_FOR_TODAY')
						)}
					</span>
				)}
				{planMode === 'tomorow' && !taskPlannedForTomorrow && (
					<span>
						{isPending || createDailyPlanLoading ? (
							<ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
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

export function AddTaskToPlanComponent({ task, employee }: { task: ITeamTask; employee?: OT_Member }) {
	const t = useTranslations();
	const { closeModal, isOpen, openModal } = useModal();
	return (
		<span
			className={clsxm(
				'font-normal whitespace-nowrap transition-all',
				'hover:font-semibold hover:transition-all cursor-pointer'
			)}
			onClick={openModal}
		>
			<AddTaskToPlan closeModal={closeModal} open={isOpen} task={task} employee={employee} />
			{t('dailyPlan.ADD_TASK_TO_PLAN')}
		</span>
	);
}

export function RemoveTaskFromPlan({ task, plan, member }: { task: ITeamTask; member?: OT_Member; plan?: IDailyPlan }) {
	const t = useTranslations();
	const { removeTaskFromPlan } = useDailyPlan();
	const data: IDailyPlanTasksUpdate = {
		taskId: task.id,
		employeeId: member?.employeeId
	};
	const onClick = () => {
		removeTaskFromPlan(data, plan?.id ?? '');
	};
	return (
		<span
			className={clsxm(
				'font-normal whitespace-nowrap transition-all text-red-600',
				'hover:font-semibold hover:transition-all cursor-pointer'
			)}
			onClick={onClick}
		>
			{t('dailyPlan.REMOVE_FROM_THIS_PLAN')}
		</span>
	);
}

export function RemoveManyTaskFromPlan({ task, member }: { task: ITeamTask; member?: OT_Member }) {
	// const t = useTranslations();
	const { removeManyTaskPlans } = useDailyPlan();
	const data: IRemoveTaskFromManyPlans = {
		plansIds: [],
		employeeId: member?.employeeId
	};
	const onClick = () => {
		removeManyTaskPlans(data, task.id ?? '');
	};
	return (
		<span
			className={clsxm(
				'font-normal whitespace-nowrap transition-all text-red-600',
				'hover:font-semibold hover:transition-all cursor-pointer'
			)}
			onClick={onClick}
		>
			Remove from all plans
		</span>
	);
}
