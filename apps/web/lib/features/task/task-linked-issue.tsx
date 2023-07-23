import { ITeamTask } from '@app/interfaces';
import { Card } from 'lib/components';
import { TaskNameInfoDisplay } from './task-displays';
import { ActiveTaskStatusDropdown } from './task-status';

export function TaskLinkedIssue({ task }: { task: ITeamTask }) {
	return (
		<Card shadow="custom" className="flex justify-between py-3 px-0 md:px-0">
			<div className="flex space-x-1">
				<TaskNameInfoDisplay task={task} />
			</div>

			<ActiveTaskStatusDropdown task={task} defaultValue={task.status} />
		</Card>
	);
}
