import { secondsToTime } from '@app/helpers';
import {
	useOutsideClick,
	useTeamTasks,
	useTimerView,
	useTaskStatistics,
} from '@app/hooks';
import { IClassName, ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import {
	Card,
	// ConfirmDropdown,
	SpinnerLoader,
	Text,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, EditIcon, MoreIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useCallback, useRef, useState } from 'react';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { TaskEstimate } from './task-estimate';
import { TaskProgressBar } from './task-progress-bar';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { TaskAvatars } from './task-item';
import { useRecoilValue } from 'recoil';
import { timerSecondsState } from '@app/stores';

type Props = {
	active?: boolean;
	task?: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign';
} & IClassName;

export function TaskCard({
	active,
	className,
	task,
	isAuthUser,
	activeAuthTask,
	viewType = 'default',
}: Props) {
	const [loading, setLoading] = useState(false);
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskDailyStat, activeTaskTotalStat, addSeconds } =
		useTaskStatistics(seconds);

	const TotalWork = () => {
		if (isAuthUser && activeAuthTask) {
			const { h, m } = secondsToTime(
				(activeTaskTotalStat?.duration || 0) + addSeconds
			);
			return (
				<div className={clsxm('flex space-x-2 items-center font-normal')}>
					<span className="text-gray-500 lg:text-sm">Total time:</span>
					<Text>
						{h}h : {m}m
					</Text>
				</div>
			);
		}
	};

	const TodayWork = () => {
		if (isAuthUser && activeAuthTask) {
			const { h: dh, m: dm } = secondsToTime(
				(activeTaskDailyStat?.duration || 0) + addSeconds
			);
			return (
				<div className={clsxm('flex flex-col items-start font-normal')}>
					<span className="text-gray-500 text-xs">Today work</span>

					<Text>
						{dh}h : {dm}m
					</Text>
				</div>
			);
		}
	};

	return (
		<div>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative md:flex items-center justify-between py-3 hidden',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				<div className="absolute -left-0">
					<DraggerIcon />
				</div>

				{/* Task information */}
				<TaskInfo task={task} className="lg:w-80 px-4 w-1/3" />
				<VerticalSeparator className="ml-2" />

				{viewType === 'default' && (
					<>
						{/* TaskEstimateInfo */}
						<div className="flex space-x-2 items-center flex-col lg:flex-row">
							<TaskEstimateInfo
								task={task}
								isAuthUser={isAuthUser}
								activeAuthTask={activeAuthTask}
								className="lg:px-3 lg:w-52 "
							/>
							{isAuthUser && task && <TimerButtonCall task={task} />}
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
						className="lg:w-48 lg:px-4 px-2"
						showTotal={viewType !== 'unassign'}
					/>
					{isAuthUser && viewType === 'unassign' && task && (
						<TimerButtonCall task={task} />
					)}
				</div>
				<VerticalSeparator />

				{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
				<ActiveTaskStatusDropdown
					task={task || null}
					className="lg:min-w-[170px] lg:mr-4 mx-auto"
					onChangeLoading={(load) => setLoading(load)}
				/>

				{/* TaskCardMenu */}
				{task && <TaskCardMenu task={task} loading={loading} />}
			</Card>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative md:hidden flex justify-between py-3 flex-col',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				{/* TaskTimes */}
				<div className="flex justify-between ml-2 mb-4">
					{/*@ts-ignore*/}
					<TotalWork />
					{isAuthUser && viewType === 'unassign' && task && (
						<TimerButtonCall task={task} />
					)}
				</div>
				{/* Task information */}
				<div className="flex justify-between items-start pb-4 border-b flex-wrap">
					<TaskInfo task={task} className="w-80 px-4 mb-4" />{' '}
					{viewType === 'default' && (
						<>
							{/* TaskEstimateInfo */}
							<div className="flex space-x-2 items-end">
								<TaskEstimateInfo
									task={task}
									isAuthUser={isAuthUser}
									activeAuthTask={activeAuthTask}
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
				{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
				<div className="flex justify-between mt-8 mb-8 space-x-5">
					<div className="flex space-x-4">
						{/*@ts-ignore*/}
						<TodayWork />
						{isAuthUser && task && <TimerButtonCall task={task} />}
					</div>

					<ActiveTaskStatusDropdown
						task={task || null}
						onChangeLoading={(load) => setLoading(load)}
					/>
				</div>
				{/* TaskCardMenu */}
				{task && <TaskCardMenu task={task} loading={loading} />}
			</Card>
		</div>
	);

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
	function TimerButtonCall({ task }: { task: ITeamTask }) {
		const [loading, setLoading] = useState(false);
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
			if (task.status === 'Closed') return;

			if (timerStatus?.running) {
				setLoading(true);
				await stopTimer().finally(() => setLoading(false));
			}

			setActiveTask(task);
			window.setTimeout(startTimer, 100);

			window.scrollTo({ top: 0, behavior: 'smooth' });
		}, [timerStatus, setActiveTask, task, stopTimer, startTimer]);

		return loading ? (
			<SpinnerLoader size={30} />
		) : (
			<TimerButton
				onClick={activeTaskStatus ? timerHanlder : startTimerWithTask}
				running={activeTaskStatus?.running}
				disabled={activeTaskStatus ? disabled : task.status === 'Closed'}
				className="h-9 w-9"
			/>
		);
	}

	//* Task Estimate info *
	function TaskEstimateInfo({
		className,
		task,
		isAuthUser,
		activeAuthTask,
	}: Props) {
		return (
			<div className={className}>
				<div className="flex items-center flex-col space-y-2">
					<TaskEstimateInput task={task} />

					<TaskProgressBar
						activeAuthTask={activeAuthTask}
						task={task}
						isAuthUser={isAuthUser}
					/>
				</div>
			</div>
		);
	}

	function TaskEstimateInput({ task }: { task?: Nullable<ITeamTask> }) {
		const loadingRef = useRef<boolean>(false);
		const [editMode, setEditMode] = useState(false);

		const hasEditMode = editMode && task;

		const closeFn = () => {
			setTimeout(() => {
				!loadingRef.current && setEditMode(false);
			}, 1);
		};

		const { targetEl, ignoreElementRef } =
			useOutsideClick<HTMLButtonElement>(closeFn);

		const { h, m } = secondsToTime(task?.estimate || 0);

		return (
			<>
				<div
					className={clsxm(!hasEditMode && ['hidden'])}
					ref={ignoreElementRef}
				>
					{task && (
						<TaskEstimate
							_task={task}
							loadingRef={loadingRef}
							closeable_fc={closeFn}
						/>
					)}
				</div>

				<div
					className={clsxm(
						'flex space-x-2 items-center mb-2 font-normal text-sm',
						hasEditMode && ['hidden']
					)}
				>
					<span className="text-gray-500">Estimated:</span>
					<Text>
						{h}h {m}m
					</Text>

					<button ref={targetEl} onClick={() => task && setEditMode(true)}>
						<EditIcon
							className={clsxm(
								'cursor-pointer w-4 h-4',
								!task && ['opacity-40 cursor-default']
							)}
						/>
					</button>
				</div>
			</>
		);
	}

	//* Task Info FC *
	function TaskInfo({
		className,
		task,
	}: IClassName & { task?: Nullable<ITeamTask> }) {
		const router = useRouter();

		return (
			<div
				className={clsxm(
					'h-full flex flex-col items-start justify-center',
					className
				)}
			>
				{/* task */}
				{!task && <div className="text-center self-center py-1">--</div>}
				{task && (
					<div className="w-full h-[40px] overflow-hidden">
						<div
							className={clsxm(
								'h-full flex flex-col items-start justify-center'
							)}
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
	}: {
		task: ITeamTask;
		loading?: boolean;
	}) {
		const { trans } = useTranslation();

		return (
			<div className="absolute right-2">
				<Popover className="relative">
					<Popover.Button className="flex items-center outline-none border-none">
						{!loading && <MoreIcon />}
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
										<ul>
											<li className="mb-2">
												<Link
													href={`/task/${task.id}`}
													className={clsxm(
														'font-normal whitespace-nowrap hover:font-semibold hover:transition-all'
													)}
												>
													{trans.common.TASK_DETAILS}
												</Link>
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
}
