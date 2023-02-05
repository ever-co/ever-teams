import { secondsToTime } from '@app/helpers';
import { useOutsideClick, useTeamTasks, useTimerView } from '@app/hooks';
import { IClassName, ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Card, SpinnerLoader, Text, VerticalSeparator } from 'lib/components';
import { DraggerIcon, EditIcon, MoreIcon } from 'lib/components/svgs';
import { useCallback, useRef, useState } from 'react';
import { TimerButton } from '../timer/timer-button';
import { TaskAllStatusTypes } from './task-all-status-type';
import { TaskNameInfoDisplay } from './task-displays';
import { TaskEstimate } from './task-estimate';
import { TaskProgressBar } from './task-progress-bar';
import { ActiveTaskStatusDropdown } from './task-status';
import { TaskTimes } from './task-times';

type Props = {
	active?: boolean;
	task?: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
} & IClassName;

export function TaskCard({
	active,
	className,
	task,
	isAuthUser,
	activeAuthTask,
}: Props) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'relative flex items-center justify-between py-3',
				active && ['border-primary-light border-[2px]'],
				className
			)}
		>
			<div className="absolute -left-0">
				<DraggerIcon />
			</div>

			<div className="absolute right-2">
				<MoreIcon />
			</div>

			{/* Task information */}
			<TaskInfo task={task} className="w-80 px-4" />
			<VerticalSeparator className="ml-2" />

			{/* TaskEstimateInfo */}
			<div className="flex space-x-2 items-center">
				<TaskEstimateInfo
					task={task}
					isAuthUser={isAuthUser}
					activeAuthTask={activeAuthTask}
					className="px-3 w-52"
				/>
				{isAuthUser && task && <TimerButtonCall task={task} />}
			</div>

			<VerticalSeparator />

			{/* TaskTimes */}
			<TaskTimes
				activeAuthTask={activeAuthTask}
				task={task}
				isAuthUser={isAuthUser}
				className="w-48 px-4"
			/>
			<VerticalSeparator />

			{/* Active Task Status Dropdown */}
			<ActiveTaskStatusDropdown
				task={task || null}
				className="lg:min-w-[170px] mr-4"
			/>
		</Card>
	);
}

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

	const startTimerWithTask = useCallback(async () => {
		if (timerStatus?.running) {
			setLoading(true);
			await stopTimer().finally(() => setLoading(false));
		}

		setActiveTask(task);
		window.setTimeout(startTimer, 100);

		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, [timerStatus, setActiveTask, task, stopTimer]);

	return loading ? (
		<SpinnerLoader size={30} />
	) : (
		<TimerButton
			onClick={activeTaskStatus ? timerHanlder : startTimerWithTask}
			running={activeTaskStatus?.running}
			disabled={activeTaskStatus ? disabled : false}
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
			<div className={clsxm(!hasEditMode && ['hidden'])} ref={ignoreElementRef}>
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
							'cursor-pointer',
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
						className={clsxm('h-full flex flex-col items-start justify-center')}
					>
						<div
							className={clsxm(
								'text-sm text-ellipsis text-center cursor-default overflow-hidden w-full'
							)}
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
