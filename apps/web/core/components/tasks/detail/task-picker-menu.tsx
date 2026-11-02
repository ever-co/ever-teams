'use client';

import { useCallback, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	TaskPropertyMenu,
	TaskPropertyMenuAction,
	type TaskPropertyMenuOption
} from '@/core/components/tasks/task-property-menu';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const MIN_CREATE_TITLE_LENGTH = 2;

export function taskNumberOf(task: Pick<TTask, 'taskNumber' | 'number'>) {
	const number = task.taskNumber ?? task.number;
	if (number === null || number === undefined || number === '') {
		return null;
	}
	return String(number);
}

function taskOptionLabel(task: TTask) {
	const number = taskNumberOf(task);
	if (!number) {
		return task.title;
	}
	return `#${number} ${task.title}`;
}

function taskOption(task: TTask): TaskPropertyMenuOption<TTask> {
	return {
		key: task.id,
		value: task,
		label: taskOptionLabel(task),
		icon: <TaskPropertyIcon kind="issueType" name={task.issueType ?? undefined} />
	};
}

function isCreatableTitle(query: string) {
	return query.trim().length >= MIN_CREATE_TITLE_LENGTH;
}

interface TaskPickerMenuProps {
	tasks: TTask[];
	onPick: (task: TTask) => void;
	searchPlaceholder: string;
	triggerLabel: string;
	triggerClassName?: string;
	children: ReactNode;
	isSelected?: (task: TTask) => boolean;
	onCreate?: (title: string) => void;
	createLabel?: (title: string) => string;
	footerActions?: ReactNode;
	align?: 'start' | 'center' | 'end';
	disabled?: boolean;
}

const NEVER_SELECTED = () => false;

export function TaskPickerMenu({
	tasks,
	onPick,
	searchPlaceholder,
	triggerLabel,
	triggerClassName,
	children,
	isSelected = NEVER_SELECTED,
	onCreate,
	createLabel,
	footerActions,
	align = 'start',
	disabled = false
}: TaskPickerMenuProps) {
	const t = useTranslations();
	const options = useMemo(() => tasks.map(taskOption), [tasks]);
	const canCreate = Boolean(onCreate);

	const footer = useCallback(
		(query: string) => {
			const showsCreate = canCreate && isCreatableTitle(query);
			const hasFooter = showsCreate || Boolean(footerActions);
			if (!hasFooter) {
				return null;
			}
			const title = query.trim();
			let label: string = t('taskDetail.picker.CREATE', { title });
			if (createLabel) {
				label = createLabel(title);
			}
			return (
				<>
					{showsCreate && (
						<TaskPropertyMenuAction icon={<Plus />} onClick={() => onCreate?.(title)}>
							{label}
						</TaskPropertyMenuAction>
					)}
					{footerActions}
				</>
			);
		},
		[canCreate, createLabel, footerActions, onCreate, t]
	);

	return (
		<TaskPropertyMenu
			options={options}
			isSelected={isSelected}
			onSelect={onPick}
			searchPlaceholder={searchPlaceholder}
			triggerLabel={triggerLabel}
			triggerClassName={triggerClassName}
			footer={footer}
			align={align}
			disabled={disabled}
			popupClassName="w-80"
			digitShortcuts={false}
		>
			{children}
		</TaskPropertyMenu>
	);
}
