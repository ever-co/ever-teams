import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { TaskAllStatusTypes, TaskInput, TaskNameInfoDisplay } from 'lib/features';
import { useRouter } from 'next/navigation';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
};

export function TaskInfo({ className, memberInfo, edition, publicTeam }: Props) {
	return (
		<>
			{!edition.task && <div className="w-full  justify-center text-center self-center">--</div>}

			<div
				className={clsxm(
					'h-full w-full flex flex-col items-start justify-start gap-[1.0620rem] max-h-full overflow-hidden',
					className,
					'!min-w-[461px] !max-w-[461px]'
				)}
			>
				{/* task */}
				<div
					className={clsxm(
						'w-full h-10 flex justify-start items-center',
						edition.editMode ? [''] : ['overflow-hidden']
					)}
				>
					{edition.task && (
						<TaskDetailAndEdition memberInfo={memberInfo} edition={edition} publicTeam={publicTeam} />
					)}
				</div>

				{edition.task && <TaskAllStatusTypes showStatus={true} task={edition.task} />}
			</div>
			{!edition.task && <div className="w-full justify-center text-center self-center">--</div>}
		</>
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
					'text-xs lg:text-sm text-ellipsis overflow-hidden cursor-pointer',
					hasEditMode && ['hidden']
				)}
				onClick={publicTeam ? () => null : () => task && router.push(`/task/${task?.id}`)}
			>
				<TaskNameInfoDisplay
					task={task}
					className={`${
						task?.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
					} rounded-sm`}
					taskTitleClassName="mt-[0.0625rem]"
				/>
			</div>

			{/* Show task input combobox when in edit mode */}
			<div ref={edition.taskEditIgnoreElement.ignoreElementRef} className={clsxm(!hasEditMode && ['hidden'])}>
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
