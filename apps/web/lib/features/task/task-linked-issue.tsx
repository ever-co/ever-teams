import { ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Card } from 'lib/components';
import Link from 'next/link';
import { TaskNameInfoDisplay } from './task-displays';
import { ActiveTaskStatusDropdown } from './task-status';

export function TaskLinkedIssue({
	task,
	className,
}: {
	task: ITeamTask;
	className?: string;
}) {
	return (
		<Card
			shadow="custom"
			className={clsxm(
				'flex justify-between items-center py-3 px-0 md:px-0',
				className
			)}
		>
			<Link href={`/task/${task.id}`}>
				<TaskNameInfoDisplay
					task={task}
					dash
					className={clsxm(
						task.issueType === 'Bug'
							? '!px-[0.3312rem] py-[0.2875rem]'
							: '!px-[0.375rem] py-[0.375rem]',
						'rounded-full'
					)}
					// className="px-1 md:px-1 flex mr-2.5"
					taskTitleClassName="font-semibold text-xs flex items-center"
					taskNumberClassName="font-semibold text-xs text-[#BAB8C4]"
				/>
			</Link>

			<ActiveTaskStatusDropdown
				task={task}
				defaultValue={task.status}
				taskStatusClassName="min-w-[6rem] h-5 text-[0.5rem] font-semibold rounded-[0.1875rem]"
				showIcon={false}
			/>
		</Card>
	);
}
