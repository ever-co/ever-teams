import {
	IClassName,
	ITaskLabel,
	ITaskPriority,
	ITaskSize,
	ITaskStatus,
	ITaskStatusField,
	ITaskStatusStack,
	ITeamTask,
	IVersionProperty,
	Nullable,
} from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Listbox, Transition } from '@headlessui/react';
import { Card } from 'lib/components';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import {
	CircleIcon,
	ClockIcon,
	CloseCircleIcon,
	HighestIcon,
	HighIcon,
	LargeIcon,
	LoginIcon,
	LowestIcon,
	LowIcon,
	MediumIcon,
	MediumSizeIcon,
	RecordIcon,
	SearchStatusIcon,
	SmallSizeIcon,
	TickCircleIcon,
	TimerIcon,
	TinySizeIcon,
	XlargeIcon,
} from 'lib/components/svgs';
import {
	Fragment,
	PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useCallbackRef, useTeamTasks } from '@app/hooks';
import clsx from 'clsx';

export type TStatusItem = {
	bgColor?: string;
	icon?: React.ReactNode | undefined;
	name?: string;
	bordered?: boolean;
};

export type TStatus<T extends string> = {
	[k in T]: TStatusItem;
};

export type TTaskStatusesDropdown<T extends ITaskStatusField> = IClassName & {
	defaultValue?: ITaskStatusStack[T];
	onValueChange?: (v: ITaskStatusStack[T]) => void;
	forDetails?: boolean;
	dynamicValues?: any[];
};

export type TTaskVersionsDropdown<T extends ITaskStatusField> = IClassName & {
	defaultValue?: ITaskStatusStack[T];
	onValueChange?: (v: ITaskStatusStack[T]) => void;
};

export type IActiveTaskStatuses<T extends ITaskStatusField> =
	TTaskStatusesDropdown<T> & {
		onChangeLoading?: (loading: boolean) => void;
	} & {
		task?: Nullable<ITeamTask>;
		showIssueLabels?: boolean;
		forDetails?: boolean;
	};

export function useActiveTaskStatus<T extends ITaskStatusField>(
	props: IActiveTaskStatuses<T>,
	status: TStatus<ITaskStatusStack[T]>,
	field: T
) {
	const { activeTeamTask, handleStatusUpdate } = useTeamTasks();

	const task = props.task !== undefined ? props.task : activeTeamTask;

	/**
	 * "When the user changes the status of a task, update the status of the task and then call the
	 * onChangeLoading function with true, and when the status update is complete, call the onChangeLoading
	 * function with false."
	 *
	 * The first line of the function is a type annotation. It says that the function takes a single
	 * argument, which is an object of type ITaskStatusStack[T]. The type annotation is optional, but it's
	 * a good idea to include it
	 * @param status - The new status of the item.
	 */
	function onItemChange(status: ITaskStatusStack[T]) {
		props.onChangeLoading && props.onChangeLoading(true);
		handleStatusUpdate(status, field, task, true).finally(() => {
			props.onChangeLoading && props.onChangeLoading(false);
		});
	}

	const { item, items, onChange } = useStatusValue<T>(
		status,
		task ? task[field] : props.defaultValue || undefined,
		onItemChange
	);

	return {
		item,
		items,
		onChange,
		task,
		field,
	};
}

export function useStatusValue<T extends ITaskStatusField>(
	statusItems: TStatus<ITaskStatusStack[T]>,
	$value: ITaskStatusStack[T] | undefined,
	onValueChange?: (v: ITaskStatusStack[T]) => void
) {
	const onValueChangeRef = useCallbackRef(onValueChange);

	const items = useMemo(() => {
		return Object.keys(statusItems).map((key) => {
			const value = statusItems[key as ITaskStatusStack[T]];
			return {
				...value,
				name: key,
			} as Required<TStatusItem>;
		});
	}, [statusItems]);

	const [value, setValue] = useState<ITaskStatusStack[T] | undefined>($value);

	const item = items.find((r) => r.name === value);

	useEffect(() => {
		setValue($value);
	}, [$value]);

	const onChange = useCallback(
		(value: ITaskStatusStack[T]) => {
			setValue(value);
			onValueChangeRef.current && onValueChangeRef.current(value);
		},
		[setValue, onValueChangeRef]
	);

	return {
		items,
		item,
		onChange,
	};
}

//! =============== Task Status ================= //

export const taskStatus: TStatus<ITaskStatus> = {
	Todo: {
		icon: <LoginIcon />,
		bgColor: '#D6E4F9',
	},
	'In Progress': {
		icon: <TimerIcon />,
		bgColor: '#ECE8FC',
	},
	'In Review': {
		icon: <SearchStatusIcon />,
		bgColor: ' #F3D8B0',
	},
	Ready: {
		icon: <ClockIcon />,
		bgColor: '#F5F1CB',
	},
	Completed: {
		icon: <TickCircleIcon className="stroke-[#292D32]" />,
		bgColor: '#D4EFDF',
	},
	Blocked: {
		icon: <CloseCircleIcon />,
		bgColor: '#F5B8B8',
	},
	Backlog: {
		icon: <CircleIcon />,
		bgColor: '#F2F2F2',
	},
	Closed: {
		icon: <TickCircleIcon className="stroke-[#acacac]" />,
		bgColor: '#eaeaea',
	},
};

/**
 * Task status dropwdown
 */
export function TaskStatusDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'status'>) {
	const { item, items, onChange } = useStatusValue<'status'>(
		taskStatus,
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'status' : undefined}
			onChange={onChange}
		/>
	);
}

/**
 * If no task hasn't been passed then the auth active task will used
 *
 * @param props
 * @returns
 */
export function ActiveTaskStatusDropdown(props: IActiveTaskStatuses<'status'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskStatus,
		'status'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== Task version ================= //

export const versionProperties: TStatus<IVersionProperty> = {
	'Version 1': {
		icon: <LoginIcon />,
		bgColor: '#ECE8FC',
	},
	'Version 2': {
		icon: <LoginIcon />,
		bgColor: '#ECE8FC',
	},
};

/**
 * Version dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the version properties
 */
export function VersionPropertiesDropown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'version'>) {
	const { item, items, onChange } = useStatusValue<'version'>(
		versionProperties,
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'version' : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== Task Epic ================= //

/**
 * Version dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the version properties
 */
export function EpicPropertiesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'epic'>) {
	const { item, items, onChange } = useStatusValue<'epic'>(
		{},
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'epic' : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== Task Status ================= //

export const taskPriorities: TStatus<ITaskPriority> = {
	Highest: {
		icon: <HighestIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	High: {
		icon: <HighIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Medium: {
		icon: <MediumIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Low: {
		icon: <LowIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Lowest: {
		icon: <LowestIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
};

/**
 * Task dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the task properties
 */
export function TaskPropertiesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'priority'>) {
	const { item, items, onChange } = useStatusValue<'priority'>(
		taskPriorities,
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'priority' : undefined}
			onChange={onChange}
		/>
	);
}

export function ActiveTaskPropertiesDropdown(
	props: IActiveTaskStatuses<'priority'>
) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskPriorities,
		'priority'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

export function TaskPriorityStatus({
	task,
	className,
	showIssueLabels,
}: { task: Nullable<ITeamTask>; showIssueLabels?: boolean } & IClassName) {
	return task?.priority ? (
		<TaskStatus
			{...taskPriorities[task?.priority]}
			showIssueLabels={showIssueLabels}
			issueType="issue"
			className={clsxm('rounded-md px-2 text-white', className)}
			bordered={false}
		/>
	) : (
		<></>
	);
}

//! =============== Task Sizes ================= //

export const taskSizes: TStatus<ITaskSize> = {
	'X-Large': {
		icon: <XlargeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Large: {
		icon: <LargeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Medium: {
		icon: <MediumSizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Small: {
		icon: <SmallSizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Tiny: {
		icon: <TinySizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
};

/**
 * Task dropdown that lets you select a task size
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A React component
 */
export function TaskSizesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'size'>) {
	const { item, items, onChange } = useStatusValue<'size'>(
		taskSizes,
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'size' : undefined}
			onChange={onChange}
		/>
	);
}

export function ActiveTaskSizesDropdown(props: IActiveTaskStatuses<'size'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskSizes,
		'size'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== Task Label ================= //

export const taskLabels: TStatus<ITaskLabel> = {
	'UI/UX': {
		icon: <ClockIcon />,
		bgColor: '#c2b1c6',
	},
	Mobile: {
		icon: <ClockIcon />,
		bgColor: '#7c7ab7',
	},
	WEB: {
		icon: <ClockIcon />,
		bgColor: '#97b7c1',
	},
	Tablet: {
		icon: <ClockIcon />,
		bgColor: '#b0c8a8',
	},
};

export function TaskLabelsDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
}: TTaskStatusesDropdown<'label'>) {
	const { item, items, onChange } = useStatusValue<'label'>(
		taskLabels,
		defaultValue,
		onValueChange
	);

	return (
		<StatusDropdown
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'label' : undefined}
			onChange={onChange}
		/>
	);
}

export function ActiveTaskLabelsDropdown(props: IActiveTaskStatuses<'label'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskLabels,
		'label'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

export function ActiveTaskProjectDropdown(
	props: IActiveTaskStatuses<'project'>
) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskLabels,
		'project'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			forDetails={props.forDetails}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

export function ActiveTaskTeamDropdown(props: IActiveTaskStatuses<'team'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(
		props,
		taskLabels,
		'team'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			forDetails={props.forDetails}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== FC Status drop down ================= //

export function TaskStatus({
	children,
	name,
	icon,
	bgColor: backgroundColor,
	className,
	active = true,
	issueType = 'status',
	showIssueLabels,
	forDetails,
	bordered,
}: PropsWithChildren<
	TStatusItem &
		IClassName & {
			active?: boolean;
			issueType?: 'status' | 'issue';
			showIssueLabels?: boolean;
			forDetails?: boolean;
		}
>) {
	return (
		<div
			className={clsxm(
				'py-2 px-4 flex items-center text-sm space-x-3',
				forDetails ? 'rounded-sm' : 'rounded-xl',

				issueType === 'issue' && ['rounded-md px-2 text-white'],
				active ? ['dark:text-default'] : ['bg-gray-200 dark:bg-gray-700'],
				bordered && ['input-border'],
				bordered &&
					backgroundColor === 'transparent' && ['text-dark dark:text-white'],
				className
			)}
			style={{ backgroundColor: active ? backgroundColor : undefined }}
		>
			<div className="flex items-center space-x-3 whitespace-nowrap">
				{active ? icon : <RecordIcon />}

				{name && (issueType !== 'issue' || showIssueLabels) && (
					<span>{name}</span>
				)}
			</div>
			{children}
		</div>
	);
}

/**
 * Fc Status drop down
 */
export function StatusDropdown<T extends TStatusItem>({
	value,
	onChange,
	items,
	className,
	defaultItem,
	issueType = 'status',
	children,
	showIssueLabels,
	forDetails,
	enabled = true,
}: PropsWithChildren<{
	value: T | undefined;
	onChange?(value: string): void;
	items: T[];
	className?: string;
	defaultItem?: ITaskStatusField;
	issueType?: 'status' | 'issue';
	forDetails?: boolean;
	showIssueLabels?: boolean;
	enabled?: boolean;
}>) {
	const defaultValue: TStatusItem = {
		bgColor: undefined,
		icon: <span></span>,
		name: defaultItem,
	};

	const currentValue = value || defaultValue;

	return (
		<div className={clsxm('relative', className)}>
			<Listbox value={value?.name || null} onChange={onChange}>
				{({ open }) => (
					<>
						<Listbox.Button className={clsx(!forDetails && 'w-full')}>
							<TaskStatus
								{...currentValue}
								forDetails={forDetails}
								active={!!value}
								showIssueLabels={showIssueLabels}
								issueType={issueType}
								className={clsxm(
									'justify-between w-full capitalize',
									!value && [
										'text-dark dark:text-white dark:bg-dark--theme-light',
									],
									forDetails && !value
										? 'bg-transparent border border-solid border-color-[#F2F2F2]'
										: 'bg-[#F2F2F2]'
								)}
							>
								{/* Checking if the issueType is status and if it is then it will render the chevron down icon.  */}
								{issueType === 'status' && (
									<ChevronDownIcon
										className={clsxm(
											'ml-2 h-5 w-5 text-default transition duration-150 ease-in-out group-hover:text-opacity-80',
											(!value || currentValue.bordered) && [
												'text-dark dark:text-white',
											]
										)}
										aria-hidden="true"
									/>
								)}
							</TaskStatus>
						</Listbox.Button>

						<Transition
							show={open && enabled}
							enter="transition duration-100 ease-out"
							enterFrom="transform scale-95 opacity-0"
							enterTo="transform scale-100 opacity-100"
							leave="transition duration-75 ease-out"
							leaveFrom="transform scale-100 opacity-100"
							leaveTo="transform scale-95 opacity-0"
							className={clsxm(
								'absolute right-0 left-0 z-40 min-w-min',
								issueType === 'issue' && ['left-auto right-auto']
							)}
						>
							<Listbox.Options>
								<Card
									shadow="bigger"
									className="!px-2 py-2 shadow-xlcard dark:shadow-lgcard-white"
								>
									{items.map((item, i) => (
										<Listbox.Option key={i} value={item.name} as={Fragment}>
											<li className="mb-3 cursor-pointer">
												<TaskStatus
													{...item}
													className={clsxm(
														issueType === 'issue' && [
															'rounded-md px-2 text-white',
														]
													)}
												/>
											</li>
										</Listbox.Option>
									))}
									{children && (
										<Listbox.Button as="div">{children}</Listbox.Button>
									)}
								</Card>
							</Listbox.Options>
						</Transition>
					</>
				)}
			</Listbox>
		</div>
	);
}
