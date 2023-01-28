import { secondsToTime } from '@app/helpers';
import { useOutsideClick } from '@app/hooks';
import { IClassName, ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Card, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { DraggerIcon, EditIcon, MoreIcon } from 'lib/components/svgs';
import { useRef, useState } from 'react';
import { TaskAllStatusTypes } from './task-all-status-type';
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
			<TaskEstimateInfo
				task={task}
				isAuthUser={isAuthUser}
				activeAuthTask={activeAuthTask}
				className="px-3 w-52"
			/>
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
								'text-sm text-ellipsis text-center cursor-default overflow-hidden'
							)}
						>
							<Tooltip
								label={task?.title || ''}
								placement="top"
								enabled={(task?.title && task?.title.length > 60) || false}
							>
								{task?.title}
							</Tooltip>
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
