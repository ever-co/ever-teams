import { useTeamTasks } from '@app/hooks';
import { IClassName, ITaskStatus, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, ConfirmDropdown, SpinnerLoader } from 'lib/components';
import { CloseIcon, RefreshIcon } from 'lib/components/svgs';
import Link from 'next/link';
import { useCallback } from 'react';
import { TaskStatusDropdown } from './task-status';

type Props = {
	task?: ITeamTask;
	onClick?: (task: ITeamTask) => void;
	selected?: boolean;
} & IClassName;

export function TaskItem({ task, selected, onClick, className }: Props) {
	const { handleStatusUpdate, updateLoading } = useTeamTasks();

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			handleStatusUpdate(status, 'status', task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() => onClick && task && onClick(task)}
		>
			<div
				className={clsxm(
					'font-normal text-sm',
					'overflow-hidden text-ellipsis flex-1',
					selected && ['font-medium text-primary dark:text-primary-light']
				)}
			>
				<span className="opacity-50">#{task?.taskNumber}</span> {task?.title}
			</div>

			<div className="flex items-center space-x-3 pl-2">
				<div onClick={(e) => e.stopPropagation()}>
					<TaskStatusDropdown
						defaultValue={task?.status}
						onValueChange={handleChange}
						className="w-full"
					/>
				</div>
				{task && <TaskAvatars task={task} />}

				<div onClick={(e) => e.stopPropagation()}>
					{task?.status !== 'Closed' && (
						<ConfirmDropdown
							onConfirm={() => handleChange('Closed')}
							confirmText={'Confirm'}
						>
							{updateLoading ? <SpinnerLoader size={20} /> : <CloseIcon />}
						</ConfirmDropdown>
					)}

					{task?.status === 'Closed' && (
						<>
							{updateLoading ? (
								<SpinnerLoader size={20} />
							) : (
								<button onClick={() => handleChange('Todo')}>
									<RefreshIcon />
								</button>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function TaskAvatars({ task }: { task: ITeamTask }) {
	const members = task.members;

	return (
		<div
			className="avatars flex -space-x-2"
			onClick={(e) => e.stopPropagation()}
		>
			{members.slice(0, 2).map((member, i) => {
				return (
					<Link key={i} href={`/profile/${member.id}`}>
						<Avatar
							shape="circle"
							className="border"
							imageUrl={member?.user?.imageUrl}
							size={25}
						/>
					</Link>
				);
			})}

			{members.length > 2 && (
				<Avatar
					shape="circle"
					className="border flex items-center justify-center"
					size={25}
				>
					<span className="text-xs">+{members.length - 2}</span>
				</Avatar>
			)}
		</div>
	);
}
