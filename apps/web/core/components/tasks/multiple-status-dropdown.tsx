'use client';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { PropsWithChildren, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';
import { cn } from '@/core/lib/helpers';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TaskPropertySelection } from './task-status';
import { TaskPropertyKind } from './task-property-icon';
import { TaskPropertyMenu, TaskPropertyMenuOption, toggleMenuSelection } from './task-property-menu';
import { taskPropertyFieldKey, taskPropertySearchKey, taskPropertyTriggerWidthStyle } from './task-property-trigger';

function multipleItemValue(item: TStatusItem) {
	return item.value || item.name;
}

function isMultipleItemSelected(item: TStatusItem, selectedValues: string[]) {
	const itemValue = String(multipleItemValue(item));
	return selectedValues.includes(itemValue);
}

function multipleMenuOption(item: TStatusItem, index: number): TaskPropertyMenuOption<string | undefined> {
	const optionValue = multipleItemValue(item);
	return {
		key: `${index}-${optionValue}`,
		value: optionValue,
		label: item.realName || item.name || '',
		icon: item.icon
	};
}

/**
 * Multiple Status Dropdown Component
 */
export function MultipleStatusDropdown<T extends TStatusItem>({
	value,
	onChange,
	items,
	className,
	taskStatusClassName,
	forDetails,
	enabled = true,
	values = [],
	disabled,
	largerWidth = false,
	disabledReason = '',
	isLoading = false,
	kind = 'label',
	placeholderLabel,
	children
}: PropsWithChildren<{
	value: T | undefined;
	values?: NonNullable<T['name']>[];
	onChange?(value: string | string[]): void;
	items: T[];
	className?: string;
	dropdownContentClassName?: string;
	taskStatusClassName?: string;
	defaultItem?: ITaskStatusField;
	issueType?: 'status' | 'issue';
	forDetails?: boolean;
	showIssueLabels?: boolean;
	enabled?: boolean;
	showButtonOnly?: boolean;
	multiple?: boolean;
	disabled?: boolean;
	showIcon?: boolean;
	largerWidth?: boolean;
	bordered?: boolean;
	sidebarUI?: boolean;
	disabledReason?: string;
	isVersion?: boolean;
	onRemoveSelected?: () => void;
	isLoading?: boolean;
	kind?: TaskPropertyKind;
	placeholderLabel?: string;
}>) {
	const t = useTranslations();
	const valueToAdd = value?.value || value?.name;
	if (valueToAdd && !values.includes(valueToAdd)) {
		values = [...values, valueToAdd];
	}
	const selectedValues = values.map(String);
	const placeholder = placeholderLabel ?? t(taskPropertyFieldKey(kind));
	const searchPlaceholder = t(taskPropertySearchKey(kind));
	const isMenuDisabled = disabled || !enabled;
	const triggerWidthStyle = taskPropertyTriggerWidthStyle(largerWidth);

	const options = useMemo(() => items.map((item, index) => multipleMenuOption(item, index)), [items]);

	const selectedItems = items.filter((item) => isMultipleItemSelected(item, selectedValues));

	const isOptionSelected = useCallback(
		(optionValue: string | undefined) => selectedValues.includes(String(optionValue)),
		[selectedValues]
	);

	const handleSelect = useCallback(
		(optionValue: string | undefined) => {
			if (!onChange) {
				return;
			}
			if (!optionValue) {
				return;
			}
			const nextValues = toggleMenuSelection(selectedValues, optionValue);
			onChange(nextValues);
		},
		[onChange, selectedValues]
	);

	return (
		<div className={cn('relative', className)}>
			<Tooltip label={disabledReason} enabled={!enabled} placement="auto">
				<TaskPropertyMenu
					options={options}
					isSelected={isOptionSelected}
					onSelect={handleSelect}
					searchPlaceholder={searchPlaceholder}
					triggerClassName={cn(
						'block max-w-full rounded-md text-left',
						!forDetails && 'w-full max-w-[170px]'
					)}
					triggerStyle={triggerWidthStyle}
					multiple={true}
					disabled={isMenuDisabled}
					footer={children}
				>
					<TaskPropertySelection
						kind={kind}
						selectedItems={selectedItems}
						placeholder={placeholder}
						isLoading={isLoading}
						forDetails={forDetails}
						className={taskStatusClassName}
					/>
				</TaskPropertyMenu>
			</Tooltip>
		</div>
	);
}
