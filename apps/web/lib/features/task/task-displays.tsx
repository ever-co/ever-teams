import { ITeamTask, Nullable } from '@app/interfaces';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';

export function TaskNameInfoDisplay({ task }: { task: Nullable<ITeamTask> }) {
	return (
		<Tooltip
			label={task?.title || ''}
			placement="top"
			enabled={(task?.title && task?.title.length > 60) || false}
		>
			<span>
				{task && (
					// Show task issue and task number
					<div className="inline-flex items-center">
						<div className="mr-1">
							<TaskIssueStatus
								showIssueLabels={false}
								className="px-1 py-1"
								task={task}
							/>
						</div>
						<span className="text-gray-500 mr-1 font-normal">
							#{task.taskNumber}
						</span>
					</div>
				)}
				<span className="font-normal">{task?.title}</span>
			</span>
		</Tooltip>
	);
}
