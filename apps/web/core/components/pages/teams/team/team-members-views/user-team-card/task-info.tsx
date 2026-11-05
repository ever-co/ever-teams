import { I_TMCardTaskEditHook } from '@/core/hooks';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { FilterTabs } from '@/core/types/daily-plan-types';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { TaskInput } from '@/core/components/tasks/task-input';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import { TaskAllStatusTypes } from '@/core/components/tasks/task-all-status-type';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
	publicTeam?: boolean;
	dayPlanTab?: FilterTabs;
	tab?: 'default' | 'unassign' | 'dailyplan';
};

export function TaskInfo({ className, edition, publicTeam, tab, dayPlanTab }: Props) {
	return (
		<>
			{!edition.task && <div className="w-full self-center text-sm text-muted-foreground">--</div>}

			<div
				className={clsxm(
					'flex h-full max-h-full w-fit min-w-80 flex-col items-start justify-start gap-1 overflow-hidden',
					!edition.task && ['min-w-fit'],
					className
				)}
			>
				{/* task */}
				<div
					className={clsxm(
						'flex h-10 w-full items-center justify-start',
						edition.editMode ? [''] : ['overflow-hidden']
					)}
				>
					{edition.task && (
						<TaskDetailAndEdition
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
		</>
	);
}

/**
 *  A component that is used to display the task name and also allow the user to edit the task name.
 */
function TaskDetailAndEdition({ edition, publicTeam }: Props) {
	const task = edition.task;
	const hasEditMode = edition.editMode && task;
	const { openTaskDrawer } = useTaskDrawer();
	const openTaskInDrawer = () => {
		if (publicTeam) {
			return;
		}
		if (task) {
			openTaskDrawer(task.id);
		}
	};

	edition.taskEditIgnoreElement.onOutsideClick(() => {
		edition.setEditMode(false);
	});

	return (
		<>
			{/* Task value */}
			<div
				ref={edition.taskEditIgnoreElement.targetEl}
				className={clsxm('cursor-pointer overflow-hidden text-ellipsis text-sm', hasEditMode && ['hidden'])}
				onClick={openTaskInDrawer}
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
			<div
				ref={edition.taskEditIgnoreElement.ignoreElementRef}
				className={clsxm(!hasEditMode && ['hidden'], 'w-full')}
			>
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
