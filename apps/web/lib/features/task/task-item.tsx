import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar } from 'lib/components';
import { CloseIcon } from 'lib/components/svgs';
import { TaskStatusDropdown } from './task-status';

type Props = {
	task?: ITeamTask;
	onClick?: (task: ITeamTask) => void;
} & IClassName;

export function TaskItem({ task, onClick, className }: Props) {
	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() => onClick && task && onClick(task)}
		>
			<div className="font-normal text-sm overflow-hidden text-ellipsis flex-1">
				{task?.title}
			</div>

			<div className="flex items-center space-x-3 pl-2">
				<TaskStatusDropdown defaultValue={task?.status} />

				<div className="avatars flex -space-x-2">
					<Avatar
						shape="circle"
						className="border"
						imageUrl="/assets/profiles/ruslan.png"
						size={30}
					/>
					<Avatar
						shape="circle"
						imageUrl="/assets/profiles/kevin.png"
						className="border"
						size={30}
					/>
				</div>
				<CloseIcon />
			</div>
		</div>
	);
}
