import { ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';

type Props = {
	task: Nullable<ITeamTask>;
	className?: string;
	titleClassName?: string;
};

export function TaskNameInfoDisplay({
	task,
	className,
	titleClassName,
}: Props) {
	return (
		<Tooltip
			label={task?.title || ''}
			placement="top"
			enabled={(task?.title && task?.title.length > 60) || false}
		>
			<span className="flex">
				{task && (
					// Show task issue and task number
					<div>
						<div className="inline-flex items-center">
							<div className="mr-1">
								<TaskIssueStatus
									showIssueLabels={false}
									className={clsxm(className)}
									task={task}
								/>
							</div>
							<span className="text-gray-500 mr-1 font-normal">
								#{task.taskNumber}
							</span>
						</div>
					</div>
				)}
				<span className={clsxm(titleClassName, 'font-normal')}>
					{task?.title}
				</span>
			</span>
		</Tooltip>
	);
}
