/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { PropsWithChildren } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CircleIcon } from 'assets/svg';
import { Tooltip } from '../duplicated-components/tooltip';
import { CustomListboxDropdown } from './custom-dropdown';
import { cn } from '@/core/lib/helpers';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TaskStatus } from './task-status';
import { SpinnerLoader } from '@/core/components/common/loader';

/**
 * Multiple Status Dropdown Component
 */
export function MultipleStatusDropdown<T extends TStatusItem>({
	value,
	onChange,
	items,
	className,
	taskStatusClassName,
	dropdownContentClassName,
	defaultItem,
	issueType = 'status',
	children,
	forDetails,
	enabled = true,
	values = [],
	disabled,
	showIcon = true,
	largerWidth = false,
	bordered = false,
	sidebarUI = false,
	disabledReason = '',
	isVersion = false,
	onRemoveSelected,
	isLoading = false
}: PropsWithChildren<{
	value: T | undefined;
	values?: NonNullable<T['name']>[];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onChange?(value: string[]): void;
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
}>) {
	const valueToAdd = value?.value || value?.name;
	if (valueToAdd && !values.includes(valueToAdd)) {
		values = [...values, valueToAdd];
	}
	const defaultValue: TStatusItem = {
		bgColor: undefined,
		icon: (
			<span>
				<CircleIcon className="w-4 h-4" />
			</span>
		),
		name: defaultItem
	};

	const triggerButton = (
		<div
			className={cn(!forDetails && 'w-full max-w-[170px]', 'cursor-pointer outline-none')}
			style={{
				width: largerWidth ? '160px' : ''
			}}
		>
			<TaskStatus
				{...defaultValue}
				active={true}
				forDetails={forDetails}
				sidebarUI={sidebarUI}
				className={cn(
					'justify-between w-full capitalize',
					sidebarUI && ['text-xs'],
					' dark:text-white dark:bg-dark--theme-light',
					forDetails && 'bg-transparent border dark:border-[#FFFFFF33] dark:bg-[#1B1D22]',
					taskStatusClassName
				)}
				titleClassName={cn(
					values.length > 0 && '!text-dark dark:!text-white',
					!value && 'dark:text-white text-slate-500'
				)}
				name={
					values.length > 0 ? `Item${values.length === 1 ? '' : 's'} (${values.length})` : defaultValue.name
				}
			>
				{isLoading ? (
					<SpinnerLoader size={12} variant="dark-white" />
				) : (
					<ChevronDownIcon className={cn('w-5 h-5 text-default dark:text-white')} />
				)}
			</TaskStatus>
		</div>
	);

	const renderItem = (item: T, isSelected: boolean) => {
		const item_value = item.value || item.name;
		return (
			<div className="relative w-full cursor-pointer outline-none">
				<TaskStatus
					showIcon={showIcon}
					{...item}
					checked={isSelected}
					className={cn(
						'!w-full',
						issueType === 'issue' && ['rounded-md px-2 text-white'],
						sidebarUI && 'rounded-[8px]',
						bordered && 'input-border',
						isVersion && 'dark:text-white'
					)}
				/>
				{isSelected && issueType !== 'issue' && (
					<button
						onClick={(e: any) => {
							e.stopPropagation();

							if (onChange && item_value) {
								const newValues = values.filter((v) => String(v) !== String(item_value));
								onChange(newValues);
							}

							onRemoveSelected?.();
						}}
						className="absolute top-2.5 right-2 h-4 w-4 bg-transparent"
					>
						<XMarkIcon className="text-dark" height={16} width={16} aria-hidden="true" />
					</button>
				)}
			</div>
		);
	};

	const handleChange = (selectedValue: any) => {
		if (!onChange) return;
		if (Array.isArray(selectedValue)) {
			onChange(selectedValue);
		} else if (selectedValue) {
			onChange([selectedValue]);
		} else {
			onChange([]);
		}
	};

	const dropdown = (
		<div className={cn('relative', className)}>
			<Tooltip label={disabledReason} enabled={!enabled} placement="auto">
				<CustomListboxDropdown
					value={value?.value || value?.name}
					values={values}
					onChange={handleChange}
					disabled={disabled}
					enabled={enabled}
					trigger={triggerButton}
					items={items}
					renderItem={renderItem as any}
					multiple={true}
					dropdownClassName="flex flex-col gap-2.5 max-h-[320px] overflow-auto scrollbar-hide !border-b-0 dark:bg-[#1B1D22]"
				>
					{children && <div className="mt-2">{children}</div>}
				</CustomListboxDropdown>
			</Tooltip>
		</div>
	);
	return dropdown;
}
