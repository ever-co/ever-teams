import { IClassName, ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Card, Tooltip, VerticalSeparator } from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';
import { TaskAllStatusTypes } from './task-all-status-type';

type Props = { active?: boolean; task?: Nullable<ITeamTask> } & IClassName;

export function TaskCard({ active, className, task }: Props) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'relative flex items-center py-3',
				active && ['border-primary-light border-[2px]'],
				className
			)}
		>
			<div className="absolute -left-0">
				<DraggerIcon />
			</div>

			{/* Task information */}
			<TaskInfo task={task} className="w-80 px-4" />
			<VerticalSeparator className="ml-2" />
		</Card>
	);
}

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

			{/* Task status */}
			<TaskAllStatusTypes task={task} />
		</div>
	);
}
