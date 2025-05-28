import { FilterTabs, I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { useRouter } from 'next/navigation';
import { TaskInput } from '@/core/components/tasks/task-input';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import { TaskAllStatusTypes } from '@/core/components/tasks/task-all-status-type';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
	dayPlanTab?: FilterTabs;
	tab?: 'default' | 'unassign' | 'dailyplan';
};

export function TaskInfo({ className, memberInfo, edition, publicTeam, tab, dayPlanTab }: Props) {
	return (
		<>
			{!edition.task && <div className="self-center justify-center w-full text-center">--</div>}

			<div
				className={clsxm(
					'h-full min-w-[20rem] w-fit flex flex-col items-start justify-start gap-[1.0620rem] max-h-full overflow-hidden',
					!edition.task && ['min-w-fit'],
					className
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
						<TaskDetailAndEdition
							memberInfo={memberInfo}
							edition={edition}
							publicTeam={publicTeam}
							tab={tab}
							dayPlanTab={dayPlanTab}
						/>
					)}
				</div>

				{edition.task && (
					<TaskAllStatusTypes showStatus={true} task={edition.task} tab={tab} dayPlanTab={dayPlanTab} />
				)}
			</div>
			{!edition.task && <div className="self-center justify-center w-full text-center">--</div>}
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
					className={clsxm(
						task?.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
						'rounded-sm'
					)}
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
						showEmoji={false}
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
