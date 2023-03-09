import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	TaskAllStatusTypes,
	TaskInput,
	TaskNameInfoDisplay,
} from 'lib/features';
import { useRouter } from 'next/router';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
};

export function TaskInfo({
	className,
	memberInfo,
	edition,
	publicTeam,
}: Props) {
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
				{edition.task && (
					<TaskDetailAndEdition
						memberInfo={memberInfo}
						edition={edition}
						publicTeam={publicTeam}
					/>
				)}
				{!edition.task && <div className="text-center">--</div>}
			</div>

			{edition.task && <TaskAllStatusTypes task={edition.task} />}
			{!edition.task && <div className="text-center self-center">--</div>}
		</div>
	);
}

/**
 *  A component that is used to display the task name and also allow the user to edit the task name.
 */
function TaskDetailAndEdition({ edition, publicTeam }: Props) {
	const task = edition.task;
	const hasEditMode = edition.editMode && task;
	const router = useRouter();

	edition.taskEditIgnoreElement.onOutsideClick(() => {
		edition.setEditMode(false);
	});

	return (
		<>
			{/* Task value */}
			<div
				ref={edition.taskEditIgnoreElement.targetEl}
				className={clsxm(
					'text-sm text-ellipsis overflow-hidden cursor-pointer',
					hasEditMode && ['hidden']
				)}
				onClick={
					publicTeam
						? () => null
						: () => task && router.push(`/task/${task?.id}`)
				}
			>
				<TaskNameInfoDisplay task={task} />
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
						showCombobox={false}
						autoFocus={true}
						autoInputSelectText={true}
						onTaskClick={(e) => {
							console.log(e);
						}}
						onEnterKey={() => {
							edition.setEditMode(false);
						}}
					/>
				)}
			</div>
		</>
	);
}
