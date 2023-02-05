import { I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskAllStatusTypes, TaskInput, TaskIssueStatus } from 'lib/features';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
};

export function TaskInfo({ className, edition }: Props) {
	return (
		<div
			className={clsxm(
				'h-full flex flex-col items-start justify-center',
				className
			)}
		>
			{/* task */}
			<div
				className={clsxm(
					'w-full h-[40px]',
					edition.editMode ? ['mb-2'] : ['overflow-hidden']
				)}
			>
				{edition.task && <TaskDetailAndEdition edition={edition} />}
				{!edition.task && <div className="text-center">--</div>}
			</div>

			{edition.task && <TaskAllStatusTypes task={edition.task} />}
			{!edition.task && <div className="text-center self-center">--</div>}
		</div>
	);
}

function TaskDetailAndEdition({ edition }: { edition: I_TMCardTaskEditHook }) {
	const task = edition.task;
	const hasEditMode = edition.editMode && task;

	edition.taskEditIgnoreElement.onOutsideClick(() => {
		edition.setEditMode(false);
	});

	return (
		<>
			{/* Task value */}
			<div
				ref={edition.taskEditIgnoreElement.targetEl}
				className={clsxm(
					'text-sm text-ellipsis text-center cursor-default overflow-hidden',
					hasEditMode && ['hidden']
				)}
				onDoubleClick={() => task && edition.setEditMode(true)}
			>
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
									<TaskIssueStatus className="px-1 py-1" task={task} />
								</div>
								<span className="text-gray-500 mr-2">#{task.taskNumber}</span>
							</div>
						)}
						{task?.title}
					</span>
				</Tooltip>
			</div>

			{/* Show task input combobox when in edit mode */}
			<div
				ref={edition.taskEditIgnoreElement.ignoreElementRef}
				className={clsxm(!hasEditMode && ['hidden'])}
			>
				{hasEditMode && (
					<TaskInput
						task={task}
						initEditMode={true}
						keepOpen={true}
						onTaskClick={(e) => {
							console.log(e);
						}}
					/>
				)}
			</div>
		</>
	);
}
