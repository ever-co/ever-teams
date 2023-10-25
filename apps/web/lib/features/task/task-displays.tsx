import { ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';

type Props = {
	task: Nullable<ITeamTask>;
	className?: string;
	taskTitleClassName?: string;
	taskNumberClassName?: string;
	dash?: boolean;
};

export function TaskNameInfoDisplay({ task, className, taskTitleClassName, taskNumberClassName, dash = false }: Props) {
	return (
		<Tooltip label={task?.title || ''} placement="top" enabled={(task?.title && task?.title.length > 60) || false}>
			<span className="flex">
				{task && (
					// Show task issue and task number
					<div>
						<div className="inline-flex items-center">
							<div className="mr-1">
								<TaskIssueStatus showIssueLabels={false} className={clsxm(className)} task={task} />
							</div>
						</div>
					</div>
				)}
				<span className={clsxm('font-normal', taskTitleClassName)}>
					<span className={clsxm('text-gray-500 mr-1 font-normal', taskNumberClassName)}>
						#{task?.taskNumber} {dash && '-'}
					</span>
					{task?.title}
				</span>
			</span>
		</Tooltip>
	);
}
