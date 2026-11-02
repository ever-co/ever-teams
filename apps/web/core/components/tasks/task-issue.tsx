import { useModal } from '@/core/hooks';
import { useIssueTypesQuery } from '@/core/hooks/tasks/use-issue-types-query';
import { clsxm } from '@/core/lib/utils';
import { BackButton, Button, Modal, Text } from '@/core/components';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { InputField } from '../duplicated-components/_input';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { Nullable } from '@/core/types/generics/utils';
import { EIssueType } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import {
	IActiveTaskStatuses,
	TStatus,
	TStatusItem,
	TTaskVersionsDropdown
} from '@/core/types/interfaces/task/task-card';
import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { StatusDropdown, TaskStatus } from './task-status';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { ISSUE_TYPE_COLORS, TaskPropertyIcon } from './task-property-icon';
import { TaskPropertyMenu, TaskPropertyMenuOption } from './task-property-menu';

export const taskIssues: TStatus<EIssueType> = {
	Bug: {
		icon: <TaskPropertyIcon kind="issueType" name={EIssueType.BUG} />,
		name: 'Bug',
		bgColor: ISSUE_TYPE_COLORS[EIssueType.BUG],
		className: 'min-w-[5rem]'
	},
	Task: {
		icon: <TaskPropertyIcon kind="issueType" name={EIssueType.TASK} />,
		name: 'Task',
		bgColor: ISSUE_TYPE_COLORS[EIssueType.TASK],
		className: 'min-w-[5rem]'
	},
	Story: {
		icon: <TaskPropertyIcon kind="issueType" name={EIssueType.STORY} />,
		name: 'Story',
		bgColor: ISSUE_TYPE_COLORS[EIssueType.STORY],
		className: 'min-w-[5rem]'
	},
	Epic: {
		icon: <TaskPropertyIcon kind="issueType" name={EIssueType.EPIC} />,
		name: 'Custom',
		bgColor: ISSUE_TYPE_COLORS[EIssueType.EPIC],
		className: 'min-w-[5rem]'
	}
};

const standardIssueTypes: string[] = Object.values(EIssueType);

/** Only Bug, Task, Story and Epic have an icon, a color and transition rules here; Memo and custom types do not. */
function isStandardIssueType(issueType: Nullable<string>): issueType is EIssueType {
	if (!issueType) {
		return false;
	}
	return standardIssueTypes.includes(issueType);
}

/** A task without an issue type, or with a custom one, shows like a Task. */
function getTaskIssue(issueType: Nullable<string>): TStatusItem {
	if (isStandardIssueType(issueType)) {
		return taskIssues[issueType];
	}
	return taskIssues[EIssueType.TASK];
}

function issueTypeMenuOption(name: string, color: string | null | undefined): TaskPropertyMenuOption<string> {
	return {
		key: name,
		value: name,
		label: name,
		icon: <TaskPropertyIcon kind="issueType" name={name} color={color} />
	};
}

function IssueTypeTriggerGlyph({ name, color }: { name?: string; color?: string | null }) {
	if (!name) {
		return (
			<span className="flex size-6 items-center justify-center rounded-md p-1.5 hairline-ring ring-foreground/10">
				<span className="size-full rounded-full hairline-border border-foreground/40" />
			</span>
		);
	}
	return <TaskPropertyIcon kind="issueType" name={name} color={color} className="size-5 [&>svg]:size-3" />;
}

/**
 * It's a dropdown that allows you to select an issue from a list of issues, and it also allows you to
 * create a new issue
 * @param  - `className` - the class name for the dropdown
 * @returns A dropdown menu with a button that opens a modal.
 */
export function TaskIssuesDropdown({
	defaultValue,
	onValueChange
}: TTaskVersionsDropdown<'issueType'> & {
	showIssueLabels?: boolean;
	taskStatusClassName?: string;
}) {
	const t = useTranslations();
	const { isOpen, closeModal } = useModal();
	const { issueTypes: taskIssues } = useIssueTypesQuery();
	const [taskIssueType, setTaskIssueType] = useState(defaultValue ?? null);
	const [isLoading, setIsLoading] = useState(false);
	const [previousValue, setPreviousValue] = useState<EIssueType | null>(defaultValue ?? null);
	/**
	 * Memoize props to prevent unnecessary re-renders.
	 */

	const taskIssuesOptions = useMemo(() => {
		return taskIssues.map((el) => ({ ...el, id: el.name }));
	}, [taskIssues]);

	const handleTaskIssueChange = useCallback(
		async (value: string) => {
			const newValue = value as EIssueType;

			// Skip if no actual change
			if (taskIssueType === newValue) return;

			// Store previous value for potential rollback
			setPreviousValue(taskIssueType);

			// STEP 1: Immediate UI update (optimistic)
			setTaskIssueType(newValue);

			// STEP 2: Start loading state
			setIsLoading(true);

			try {
				// STEP 3: API call
				await onValueChange?.(newValue);
			} catch (error) {
				// STEP 4: Error - revert to previous value and show error toast
				setTaskIssueType(previousValue);
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('toasts.tasks.PROPERTY_UPDATE_FAILED', { field: 'issueType' }), {
					description: t(reasonKey)
				});
				console.error('Error updating task issue type:', error);
			} finally {
				// Always clear loading state
				setIsLoading(false);
			}
		},
		[taskIssueType, onValueChange, previousValue, t]
	);

	const menuOptions = useMemo(
		() => taskIssuesOptions.map((item) => issueTypeMenuOption(item.name, item.color)),
		[taskIssuesOptions]
	);

	const selectedIssue = useMemo(
		() => taskIssuesOptions.find((item) => item.name === taskIssueType),
		[taskIssuesOptions, taskIssueType]
	);

	const isIssueSelected = useCallback((value: string) => value === taskIssueType, [taskIssueType]);

	const handleIssueSelect = useCallback(
		(value: string) => {
			void handleTaskIssueChange(value);
		},
		[handleTaskIssueChange]
	);

	return (
		<>
			<div className="relative">
				<TaskPropertyMenu
					options={menuOptions}
					isSelected={isIssueSelected}
					onSelect={handleIssueSelect}
					searchPlaceholder={t('taskMenus.search.issueType')}
					triggerLabel={t('taskMenus.fields.issueType')}
					triggerClassName="flex size-full items-center justify-center rounded-md"
				>
					<IssueTypeTriggerGlyph name={selectedIssue?.name} color={selectedIssue?.color} />
				</TaskPropertyMenu>

				{/* Loading indicator */}
				{isLoading && (
					<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
						<div className="w-4 h-4 rounded-full border-b-2 animate-spin border-primary"></div>
					</div>
				)}
			</div>

			<CreateTaskIssueModal open={isOpen} closeModal={closeModal} />
		</>
	);
}

/**
 * It's a dropdown that lets you change the issue status of an active task
 * @param props - IActiveTaskStatuses<'issue'>
 * @returns A dropdown component that allows the user to select a status for the task.
 */
export function ActiveTaskIssuesDropdown({ ...props }: IActiveTaskStatuses<'issueType'>) {
	const t = useTranslations();
	const { item, items, onChange, field, isLocalLoading } = useActiveTaskStatus(props, taskIssues, 'issueType');

	const validTransitions: Record<EIssueType, TStatusItem[]> = useMemo(
		() => ({
			[EIssueType.EPIC]: [],
			[EIssueType.STORY]: items.filter((it) =>
				[EIssueType.TASK, EIssueType.BUG].includes(it.value as EIssueType)
			),

			[EIssueType.TASK]: items.filter((it) =>
				[EIssueType.STORY, EIssueType.BUG].includes(it.value as EIssueType)
			),

			[EIssueType.BUG]: items.filter((it) => [EIssueType.STORY, EIssueType.TASK].includes(it.value as EIssueType))
		}),
		[items]
	);

	const updatedItemsBasedOnTaskIssueType = useMemo(() => {
		// A custom issue type has no transition rules: like a task without a type, it can take any type.
		const getValidTransitions = (issueType: string): TStatusItem[] => {
			if (isStandardIssueType(issueType)) {
				return validTransitions[issueType];
			}
			return items;
		};

		let updatedItemsBasedOnTaskIssueType: TStatusItem[] = [];
		if (props.task && props.task?.issueType && props.task.parent) {
			updatedItemsBasedOnTaskIssueType = getValidTransitions(props.task?.issueType);

			// If parent task is already Story then user can not assign current task as a Story
			if (props.task.parent.issueType === EIssueType.STORY) {
				updatedItemsBasedOnTaskIssueType = updatedItemsBasedOnTaskIssueType.filter(
					(it) => it.value !== EIssueType.STORY
				);
			}
		} else if (props.task && props.task?.issueType) {
			updatedItemsBasedOnTaskIssueType = getValidTransitions(props.task?.issueType);
		} else {
			// Default show types in Dropdown
			updatedItemsBasedOnTaskIssueType = items;
		}

		return updatedItemsBasedOnTaskIssueType;
	}, [props.task, items, validTransitions]);

	return (
		<StatusDropdown
			sidebarUI={props.sidebarUI}
			className={props.className}
			items={props.forParentChildRelationship ? updatedItemsBasedOnTaskIssueType : items}
			value={item || (taskIssues['Task'] as Required<TStatusItem>)}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
			issueType="issue"
			enabled={item?.name !== 'Epic'}
			showIssueLabels={props.showIssueLabels}
			disabledReason={item?.name === 'Epic' ? t('pages.taskDetails.TASK_IS_ALREADY_EPIC') : ''}
			taskStatusClassName={props.taskStatusClassName}
			isLoading={isLocalLoading}
			titleClassName={props.titleClassName}
		/>
	);
}

/**
 * It returns a TaskStatus component with the taskIssues[task?.issue || 'Task'] object as props, and
 * the className prop set to 'rounded-md px-2 text-white'
 * @param  - `taskIssues` - an object that contains the status of each issue.
 * @returns A TaskStatus component with the taskIssues[task?.issue || 'Task'] props.
 */
export function TaskIssueStatus({
	task,
	className,
	showIssueLabels
}: { task: Nullable<TTask>; showIssueLabels?: boolean } & IClassName) {
	return (
		<TaskStatus
			{...getTaskIssue(task?.issueType)}
			showIssueLabels={showIssueLabels}
			issueType="issue"
			className={clsxm(className)}
		/>
	);
}

/**
 * It's a modal that allows you to create a new issue
 * @param  - `open` - a boolean that determines whether the modal is open or not
 * @returns A modal that allows the user to create a task issue.
 */
export function CreateTaskIssueModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
	};

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[430px]" autoComplete="off" onSubmit={handleSubmit}>
				<div className="w-full">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center text-lg font-semibold text-balance">
							{t('common.CREATE_ISSUE')}
						</Text.Heading>

						<div className="mt-5 w-full">
							<InputField
								name="name"
								autoCustomFocus
								placeholder={t('form.ISSUE_NAME_PLACEHOLDER')}
								required
							/>
						</div>

						<div className="flex justify-between items-center mt-3 w-full">
							<BackButton onClick={closeModal} />
							<Button type="submit">{t('common.CREATE')}</Button>
						</div>
					</div>
				</div>
			</form>
		</Modal>
	);
}
