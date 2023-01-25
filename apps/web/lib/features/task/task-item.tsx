import { useTeamTasks } from '@app/hooks';
import { IClassName, ITaskStatus, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, ConfirmDropdown, SpinnerLoader } from 'lib/components';
import { CloseIcon } from 'lib/components/svgs';
import { useCallback } from 'react';
import { TaskStatusDropdown } from './task-status';

type Props = {
	task?: ITeamTask;
	onClick?: (task: ITeamTask) => void;
} & IClassName;

export function TaskItem({ task, onClick, className }: Props) {
	const { handleStatusUpdate, updateLoading } = useTeamTasks();

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			handleStatusUpdate(status, task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() => onClick && task && onClick(task)}
		>
			<div className="font-normal text-sm overflow-hidden text-ellipsis flex-1">
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
					<ConfirmDropdown
						onConfirm={() =>
							handleChange(task?.status === 'Closed' ? 'Todo' : 'Closed')
						}
						confirmText={task?.status === 'Closed' ? 'Restore' : 'Confirm'}
					>
						{updateLoading ? <SpinnerLoader size={20} /> : <CloseIcon />}
					</ConfirmDropdown>
				</div>
			</div>
		</div>
	);
}

function TaskAvatars({ task }: { task: ITeamTask }) {
	const members = task.teams[0]?.members || [];

	return (
		<div className="avatars flex -space-x-2">
			{members.map((member) => {
				return (
					<Avatar
						key={member.id}
						shape="circle"
						className="border"
						imageUrl={member.employee.user?.imageUrl}
						size={30}
					/>
				);
			})}
		</div>
	);
}
