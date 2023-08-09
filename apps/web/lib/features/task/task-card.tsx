import { secondsToTime } from '@app/helpers';
import {
	useTeamTasks,
	useTimerView,
	useTaskStatistics,
	I_UserProfilePage,
	useOrganizationTeams,
	useTeamMemberCard,
	useTMCardTaskEdit,
	I_TeamMemberCardHook,
	useOrganizationEmployeeTeams,
} from '@app/hooks';
import {
	IClassName,
	IOrganizationTeamList,
	ITeamTask,
	Nullable,
	OT_Member,
} from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import {
	Card,
	// ConfirmDropdown,
	SpinnerLoader,
	Text,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, MoreIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useCallback, useState } from 'react';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { TaskAvatars } from './task-item';
import { SetterOrUpdater, useRecoilValue } from 'recoil';
import { timerSecondsState } from '@app/stores';
import { TaskEstimateInfo } from '../team/user-team-card/task-estimate';
import { TaskAssignButton } from './task-assign-button';

type Props = {
	active?: boolean;
	task?: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign';
	profile?: I_UserProfilePage;
	editTaskId?: string | null;
	setEditTaskId?: SetterOrUpdater<string | null>;
} & IClassName;

export function TaskCard(props: Props) {
	const {
		active,
		className,
		task,
		isAuthUser,
		activeAuthTask,
		viewType = 'default',
		profile,
	} = props;

	const [loading, setLoading] = useState(false);
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskDailyStat, activeTaskTotalStat, addSeconds } =
		useTaskStatistics(seconds);
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const members = activeTeam?.members || [];
	const currentMember = members.find((m) => {
		return m.employee.user?.id === profile?.userProfile?.id;
	});

	const { h, m } = secondsToTime(
		(activeTaskTotalStat?.duration || 0) + addSeconds
	);
	const totalWork =
		isAuthUser && activeAuthTask ? (
			<div className={clsxm('flex space-x-2 items-center font-normal')}>
				<span className="text-gray-500 lg:text-sm">Total time:</span>
				<Text>
					{h}h : {m}m
				</Text>
			</div>
		) : (
			<></>
		);

	// Daily work
	const { h: dh, m: dm } = secondsToTime(
		(activeTaskDailyStat?.duration || 0) + addSeconds
	);
	const todayWork =
		isAuthUser && activeAuthTask ? (
			<div className={clsxm('flex flex-col items-start font-normal')}>
				<span className="text-gray-500 text-xs">Today work</span>
				<Text>
					{dh}h : {dm}m
				</Text>
			</div>
		) : (
			<></>
		);

	const memberInfo = useTeamMemberCard(currentMember || undefined);
	const taskEdition = useTMCardTaskEdit(task);

	return (
		<>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative md:flex items-center justify-between py-3 hidden min-h-[7rem] dark:bg-[#101217] border-[0.125rem] dark:border-[#FFFFFF0D]',
					active && ['border-primary-light dark:bg-[#1E2025] '],
					className
				)}
			>
				<div className="absolute -left-0">
					<DraggerIcon />
				</div>

				{/* Task information */}
				<TaskInfo task={task} className="lg:w-[330px] w-1/4 px-4 " />
				<VerticalSeparator className="ml-2" />

				{viewType === 'default' && (
					<>
						{/* TaskEstimateInfo */}
						<div className="flex space-x-2 items-center flex-col lg:flex-row">
							<TaskEstimateInfo
								memberInfo={memberInfo}
								edition={taskEdition}
								activeAuthTask={true}
								className="lg:px-3 lg:w-52 "
							/>
						</div>
						<VerticalSeparator />
					</>
				)}

				{viewType === 'unassign' && (
					<>
						<UsersTaskAssigned className="lg:px-3 lg:w-52" task={task} />
						<VerticalSeparator />
					</>
				)}

				{/* TaskTimes */}
				<div className="flex items-center">
					<TaskTimes
						activeAuthTask={activeAuthTask}
						task={task}
						isAuthUser={isAuthUser}
						className="lg:w-48 lg:px-4 px-2 flex flex-col gap-5"
						showTotal={viewType !== 'unassign'}
						memberInfo={profile?.member}
					/>
					{isTrackingEnabled && isAuthUser && task && (
						<TimerButtonCall
							activeTeam={activeTeam}
							currentMember={currentMember}
							task={task}
						/>
					)}
					{!isAuthUser && task && viewType === 'unassign' && (
						<AssignTaskButtonCall
							task={task}
							assignTask={memberInfo.assignTask}
						/>
					)}
				</div>
				<VerticalSeparator />

				{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
				<ActiveTaskStatusDropdown
					className="lg:w-44"
					task={task}
					onChangeLoading={(load) => setLoading(load)}
				/>

				{/* TaskCardMenu */}
				{task && memberInfo && currentMember && (
					<TaskCardMenu
						task={task}
						loading={loading}
						memberInfo={memberInfo}
						viewType={viewType}
					/>
				)}
			</Card>

			{/* Small screen size */}
			<Card
				shadow="bigger"
				className={clsxm(
					'relative md:hidden flex justify-between py-3 flex-col',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				<div className="flex justify-between ml-2 mb-4">
					{totalWork}
					{isTrackingEnabled &&
						isAuthUser &&
						viewType === 'unassign' &&
						task && (
							<TimerButtonCall
								activeTeam={activeTeam}
								currentMember={currentMember}
								task={task}
							/>
						)}
				</div>
				<div className="flex justify-between items-start pb-4 border-b flex-wrap">
					<TaskInfo task={task} className="w-80 px-4 mb-4" />{' '}
					{viewType === 'default' && (
						<>
							<div className="flex space-x-2 items-end">
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
						<UsersTaskAssigned className="px-3 w-52" task={task} />
					</>
				)}
				<div className="flex justify-between mt-8 mb-8 space-x-5">
					<div className="flex space-x-4">
						{todayWork}
						{isTrackingEnabled && isAuthUser && task && (
							<TimerButtonCall
								activeTeam={activeTeam}
								currentMember={currentMember}
								task={task}
							/>
						)}
					</div>

					<ActiveTaskStatusDropdown
						task={task || null}
						onChangeLoading={(load) => setLoading(load)}
					/>
				</div>

				{task && memberInfo && currentMember && (
					<TaskCardMenu
						task={task}
						loading={loading}
						memberInfo={memberInfo}
						viewType={viewType}
					/>
				)}
			</Card>
		</>
	);
}

function UsersTaskAssigned({
	task,
	className,
}: { task: Nullable<ITeamTask> } & IClassName) {
	const { trans } = useTranslation();
	const members = task?.members || [];

	return (
		<div className={clsxm('flex justify-center items-center', className)}>
			<div className="flex flex-col justify-center">
				<span className="mb-1 text-xs text-center">
					{trans.common.ASSIGNED}
				</span>
				<span className="font-medium text-center text-sm">
					{members.length > 0
						? `${members.length} ${trans.common.PEOPLE}`
						: trans.task.tabFilter.NO_TASK_USER_ASSIGNED}
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
}: {
	task: ITeamTask;
	currentMember: OT_Member | undefined;
	activeTeam: IOrganizationTeamList | null;
}) {
	const [loading, setLoading] = useState(false);
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const {
		disabled,
		timerHanlder,
		timerStatus,
		activeTeamTask,
		startTimer,
		stopTimer,
	} = useTimerView();

	const { setActiveTask } = useTeamTasks();

	const activeTaskStatus =
		activeTeamTask?.id === task.id ? timerStatus : undefined;

	/* It's a function that is called when the timer button is clicked. */
	const startTimerWithTask = useCallback(async () => {
		if (task.status === 'closed') return;

		if (timerStatus?.running) {
			setLoading(true);
			await stopTimer().finally(() => setLoading(false));
		}

		setActiveTask(task);

		// Update Current user's active task to sync across multiple devices
		const currentEmployeeDetails = activeTeam?.members.find(
			(member) => member.id === currentMember?.id
		);
		if (currentEmployeeDetails && currentEmployeeDetails.id) {
			updateOrganizationTeamEmployee(currentEmployeeDetails.id, {
				organizationId: task.organizationId,
				activeTaskId: task.id,
				organizationTeamId: activeTeam?.id,
				tenantId: activeTeam?.tenantId,
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
		updateOrganizationTeamEmployee,
	]);

	return loading ? (
		<SpinnerLoader size={30} />
	) : (
		<TimerButton
			onClick={activeTaskStatus ? timerHanlder : startTimerWithTask}
			running={activeTaskStatus?.running}
			disabled={activeTaskStatus ? disabled : task.status === 'closed'}
			className="h-14 w-14"
		/>
	);
}

function AssignTaskButtonCall({
	task,
	assignTask,
}: {
	task: ITeamTask;
	assignTask: (task: ITeamTask) => Promise<void>;
}) {
	const {
		disabled,

		timerStatus,
		activeTeamTask,
	} = useTimerView();

	const activeTaskStatus =
		activeTeamTask?.id === task.id ? timerStatus : undefined;

	return (
		<TaskAssignButton
			onClick={() => {
				assignTask(task);
			}}
			disabled={activeTaskStatus ? disabled : task.status === 'closed'}
			className="h-9 w-9"
		/>
	);
}

//* Task Estimate info *

//* Task Info FC *
function TaskInfo({
	className,
	task,
}: IClassName & { task?: Nullable<ITeamTask> }) {
	const router = useRouter();

	return (
		<div
			className={clsxm(
				'h-full flex flex-col items-start justify-between gap-[1.0625rem]',
				className
			)}
		>
			{/* task */}
			{!task && <div className="text-center self-center py-1">--</div>}
			{task && (
				<div className="w-full h-10 overflow-hidden">
					<div
						className={clsxm('h-full flex flex-col items-start justify-start')}
					>
						<div
							className={clsxm(
								'text-sm text-ellipsis overflow-hidden w-full cursor-pointer'
							)}
							onClick={() => task && router.push(`/task/${task?.id}`)}
						>
							<TaskNameInfoDisplay task={task} />
						</div>
					</div>
				</div>
			)}

			{/* Task status */}
			{task && <TaskAllStatusTypes task={task} />}
			{!task && <div className="text-center self-center py-1">--</div>}
		</div>
	);
}
/**
 * It's a dropdown menu that allows the user to remove the task.
 */
function TaskCardMenu({
	task,
	loading,
	memberInfo,
	viewType,
}: {
	task: ITeamTask;
	loading?: boolean;
	memberInfo?: I_TeamMemberCardHook;
	viewType: 'default' | 'unassign';
}) {
	const { trans } = useTranslation();
	const handleAssignment = useCallback(() => {
		if (viewType === 'unassign') {
			memberInfo?.assignTask(task);
		} else {
			memberInfo?.unassignTask(task);
		}
	}, [memberInfo, task, viewType]);

	return (
		<div className="absolute right-2">
			<Popover className="relative">
				<Popover.Button className="flex items-center outline-none border-none">
					{!loading && <MoreIcon className="dark:stroke-[#B1AEBC]" />}
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
								<Card shadow="custom" className="shadow-xlcard !py-3 !px-4">
									<ul className="min-w-[124px]">
										<li className="mb-2">
											<Link
												href={`/task/${task.id}`}
												className={clsxm(
													'font-normal whitespace-nowrap transition-all',
													'hover:font-semibold hover:transition-all'
												)}
											>
												{trans.common.TASK_DETAILS}
											</Link>
										</li>
										<li className="mb-2">
											<span
												className={clsxm(
													'font-normal whitespace-nowrap transition-all',
													'hover:font-semibold hover:transition-all cursor-pointer'
												)}
												onClick={handleAssignment}
											>
												{viewType === 'unassign'
													? trans.common.ASSIGN_TASK
													: trans.common.UNASSIGN_TASK}
											</span>
										</li>

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
												{trans.common.REMOVE}
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
		</div>
	);
}
