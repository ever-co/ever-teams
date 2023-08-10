import { ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';

type Props = {
	task: Nullable<ITeamTask>;
	className?: string;
};

export function TaskNameInfoDisplay({ task, className }: Props) {
	console.log(task);

	return (
		<Tooltip
			label={task?.title || ''}
			placement="top"
			enabled={(task?.title && task?.title.length > 60) || false}
		>
			<span className="flex items-center">
				{task && (
					// Show task issue and task number
					<div>
						<div className="inline-flex items-center">
							<div className="mr-1">
								<TaskIssueStatus
									showIssueLabels={false}
									className={clsxm(
										' rounded-sm h-auto',
										task.issueType === 'Bug'
											? '!px-[5.3px] py-[4.6px]'
											: '!px-[6px] py-[6px]',
										className
									)}
									task={task}
								/>
							</div>
							<span className="text-gray-500 mr-1 font-normal">
								#{task.taskNumber}
							</span>
						</div>
					</div>
				)}
				<span className="font-normal">{task?.title}</span>
			</span>
		</Tooltip>
	);
}
