'use client';

import { useTranslations } from 'next-intl';
import { CustomSelect } from '@/core/components/common/multiple-select';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import type { TimeLogTaskChoice } from '@/core/hooks/timesheet/use-time-log-task-choice';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const FIELD_LABEL = 'text-xs font-medium text-muted-foreground';

const FIELD_NOTE = 'text-xs text-muted-foreground';

export function TaskLine({ task }: Readonly<{ task: TTask | null | undefined }>) {
	return (
		<TaskNameInfoDisplay
			task={task ?? null}
			className="h-auto min-w-0 rounded-sm"
			taskTitleClassName="overflow-hidden text-ellipsis text-sm"
			taskNumberClassName="text-sm"
			showSize
			dash
		/>
	);
}

export function TimeLogTaskField({
	choice,
	entryTask
}: Readonly<{ choice: TimeLogTaskChoice; entryTask: TTask | null | undefined }>) {
	const t = useTranslations();
	const taskLabel = t('manualTime.TASK');

	if (!choice.canChangeTask) {
		return (
			<div className="flex flex-col gap-1">
				<span className={FIELD_LABEL}>{taskLabel}</span>
				<TaskLine task={entryTask} />
				<p className={FIELD_NOTE}>{t('manualTime.TASK_CHANGE.OTHER_TEAM')}</p>
			</div>
		);
	}

	const followedProjectName = choice.followedProjectName;

	return (
		<div className="flex flex-col gap-1">
			<span className={FIELD_LABEL}>{taskLabel}</span>
			<CustomSelect
				value={choice.taskId}
				onChange={choice.pickTask}
				ariaLabel={taskLabel}
				placeholder={t('modals.manualTime.SELECT_TASK')}
				className="w-full"
				classNameGroup="max-h-[40vh]"
				options={choice.taskChoices}
				renderOption={(task: TTask) => <TaskLine task={task} />}
			/>
			{followedProjectName && (
				<p className={FIELD_NOTE}>
					{t('manualTime.TASK_CHANGE.PROJECT_FOLLOWS', { project: followedProjectName })}
				</p>
			)}
		</div>
	);
}
