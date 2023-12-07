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
	showSize?: boolean;
};

const taskSizeColor = {
	'x-large': { color: 'text-red-700', short: 'XXL' },
	large: { color: 'text-orange-700', short: 'XL' },
	medium: { color: 'text-yellow-500', short: 'M' },
	small: { color: 'text-blue-700', short: 'S' },
	tiny: { color: 'text-blue-500', short: 'XS' }
};

export function TaskNameInfoDisplay({
	task,
	className,
	taskTitleClassName,
	taskNumberClassName,
	dash = false,
	showSize = false
}: Props) {
	const size =
		task && task?.size && ['x-large', 'large', 'medium', 'small', 'tiny'].includes(task?.size.toLowerCase())
			? task?.size.toLowerCase()
			: 'medium';

	// @ts-expect-error
	const color: string = taskSizeColor[size].color;
	// @ts-expect-error
	const short: string = taskSizeColor[size].short;
	console.log(task?.size);
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
					{showSize && <span className={clsxm(size && `${color}`)}>{size && '  ' + short}</span>}
				</span>
			</span>
		</Tooltip>
	);
}
