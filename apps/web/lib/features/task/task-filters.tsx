'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import {
	I_UserProfilePage,
	useAuthenticateUser,
	useDailyPlan,
	useOrganizationTeams,
	useOutsideClick
} from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Transition } from '@headlessui/react';
import { Button, InputField, Tooltip, VerticalSeparator } from 'lib/components';
import { SearchNormalIcon } from 'assets/svg';
import intersection from 'lodash/intersection';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TaskUnOrAssignPopover } from './task-assign-popover';
import { TaskLabelsDropdown, TaskPropertiesDropdown, TaskSizesDropdown, TaskStatusDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { SettingFilterIcon } from 'assets/svg';
import { DailyPlanFilter } from './daily-plan/daily-plan-filter';
import { FiltersDatePickerWithRange } from './task-filters-date-picker';

type ITab = 'worked' | 'assigned' | 'unassigned' | 'dailyplan';
type ITabs = {
	tab: ITab;
	name: string;
	count: number;
	description: string;
};

type FilterType = 'status' | 'search' | undefined;
type IStatusType = 'status' | 'size' | 'priority' | 'label';

type StatusFilter = { [x in IStatusType]: string[] };

/**
 * It returns an object with the current tab, a function to set the current tab, and an array of tabs
 * @param {I_UserProfilePage} hook - I_UserProfilePage - this is the hook that we're using in the
 * component.
 */
export function useTaskFilter(profile: I_UserProfilePage) {
	const t = useTranslations();
	const defaultValue =
		typeof window !== 'undefined' ? (window.localStorage.getItem('task-tab') as ITab) || null : 'worked';

	const { activeTeamManagers, activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { profileDailyPlans } = useDailyPlan();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	const canSeeActivity = profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;

	const [tab, setTab] = useState<ITab>(defaultValue || 'worked');
	const [filterType, setFilterType] = useState<FilterType>(undefined);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [appliedStatusFilter, setAppliedStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [taskName, setTaskName] = useState('');

	const tasksFiltered: { [x in ITab]: ITeamTask[] } = {
		unassigned: profile.tasksGrouped.unassignedTasks,
		assigned: profile.tasksGrouped.assignedTasks,
		worked: profile.tasksGrouped.workedTasks,
		dailyplan: [] // Change this soon
	};

	const tasks = tasksFiltered[tab];

	const outclickFilterCard = useOutsideClick<HTMLDivElement>(() => {
		if (filterType === 'search' && taskName.trim().length === 0) {
			setFilterType(undefined);
		} else if (filterType === 'status') {
			const hasStatus = (Object.keys(statusFilter) as IStatusType[]).some((skey) => {
				return statusFilter[skey] && statusFilter[skey].length > 0;
			});
			!hasStatus && setFilterType(undefined);
		}
	});

	const tabs: ITabs[] = [
		{
			tab: 'assigned',
			name: t('common.ASSIGNED'),
			description: t('task.tabFilter.ASSIGNED_DESCRIPTION'),
			count: profile.tasksGrouped.assignedTasks.length
		},
		{
			tab: 'unassigned',
			name: t('common.UNASSIGNED'),
			description: t('task.tabFilter.UNASSIGNED_DESCRIPTION'),
			count: profile.tasksGrouped.unassignedTasks.length
		}
	];

	// For tabs on profile page, display "Worked" and "Daily Plan" only for the logged in user or managers
	if (activeTeam?.shareProfileView || canSeeActivity) {
		tabs.push({
			tab: 'dailyplan',
			name: 'Daily Plan',
			description: 'This tab shows all yours tasks planned',
			count: profile.tasksGrouped.dailyplan?.length
		});
		tabs.unshift({
			tab: 'worked',
			name: t('common.WORKED'),
			description: t('task.tabFilter.WORKED_DESCRIPTION'),
			count: profile.tasksGrouped.workedTasks.length
		});
	}

	useEffect(() => {
		window.localStorage.setItem('task-tab', tab);
	}, [tab]);

	useEffect(() => {
		setTaskName('');
	}, [filterType]);

	const toggleFilterType = useCallback(
		(type: NonNullable<FilterType>) => {
			setFilterType((flt) => {
				return flt === type ? undefined : type;
			});
		},
		[setFilterType]
	);

	const onChangeStatusFilter = useCallback(
		(type: IStatusType, value: string[]) => {
			return setStatusFilter((state) => {
				return {
					...state,
					[type]: value
				};
			});
		},
		[setStatusFilter]
	);

	// Reset status applied filter status when filter changed
	useEffect(() => {
		if (filterType !== 'status') {
			setAppliedStatusFilter({} as StatusFilter);
		}
	}, [filterType]);

	const onResetStatusFilter = useCallback(() => {
		setStatusFilter({} as StatusFilter);
		setAppliedStatusFilter({} as StatusFilter);
	}, [setStatusFilter]);

	/**
	 * Apply filter status filter
	 */
	const applyStatusFilder = useCallback(() => {
		setAppliedStatusFilter(statusFilter);
	}, [statusFilter]);

	const $tasks = useMemo(() => {
		const n = taskName.trim().toLowerCase();
		const statusFilters = appliedStatusFilter;

		return tasks
			.filter((task) => {
				return n ? task.title.toLowerCase().includes(n) : true;
			})
			.filter((task) => {
				const keys = Object.keys(statusFilters) as IStatusType[];

				return keys
					.filter((k) => statusFilters[k].length > 0)
					.every((k) => {
						return k === 'label'
							? intersection(
								statusFilters[k],
								task['tags'].map((item) => item.name)
							).length === statusFilters[k].length
							: statusFilters[k].includes(task[k]);
					});
			});
	}, [tasks, taskName, appliedStatusFilter]);

	return {
		tab,
		setTab,
		tabs,
		filterType,
		toggleFilterType,
		tasksFiltered: $tasks,
		taskName,
		setTaskName,
		statusFilter,
		onChangeStatusFilter,
		onResetStatusFilter,
		applyStatusFilder,
		tasksGrouped: profile.tasksGrouped,
		outclickFilterCard,
		profileDailyPlans
	};
}

export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

/**
 * It's a wrapper for two components, one of which is a wrapper for another component
 * @param  - IClassName & { hook: I_TaskFilter }
 * @returns A div with a className of 'flex justify-between' and a className of whatever is passed in.
 */

type Props = { hook: I_TaskFilter; profile: I_UserProfilePage };
export function TaskFilter({ className, hook, profile }: IClassName & Props) {
	return (
		<div className="relative w-full !z-50">
			<div
				className={clsxm(
					'flex justify-between flex-col xs:flex-row  items-center w-full flex-wrap-reverse lg:flex-nowrap',
					className
				)}
			>
				<TabsNav hook={hook} />
				<InputFilters profile={profile} hook={hook} />
			</div>

			{/*  It's a transition component that is used to animate the transition of the TaskStatusFilter
		component. */}
			<Transition
				show={hook.filterType !== undefined}
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0 ease-out"
				className="w-full"
				ref={hook.outclickFilterCard.targetEl}
			>
				{/* {hook.filterType !== undefined && <Divider className="mt-4" />} */}
				{hook.filterType === 'status' && (
					<TaskStatusFilter hook={hook} employeeId={profile.member?.employeeId || ''} />
				)}
				{hook.filterType === 'search' && (
					<TaskNameFilter
						value={hook.taskName}
						setValue={hook.setTaskName}
						close={() => {
							hook.toggleFilterType('search');
						}}
					/>
				)}
			</Transition>
		</div>
	);
}

/**
 * It renders a search icon, a vertical separator, a filter button, and an assign task button
 * @returns A div with a button, a vertical separator, a button, and a button.
 */
function InputFilters({ hook, profile }: Props) {
	const t = useTranslations();
	const [loading, setLoading] = useState(false);

	const osSpecificAssignTaskTooltipLabel = 'A';

	return (
		<div className="flex items-center mt-8 space-x-2 lg:space-x-5 xs:mt-4">
			<button
				ref={hook.outclickFilterCard.ignoreElementRef}
				className={clsxm('outline-none')}
				onClick={() => hook.toggleFilterType('search')}
			>
				<SearchNormalIcon
					className={clsxm(
						'dark:stroke-white w-4 h-4',
						hook.filterType === 'search' && ['stroke-primary-light dark:stroke-primary-light']
					)}
				/>
			</button>

			<VerticalSeparator />

			<button
				ref={hook.outclickFilterCard.ignoreElementRef}
				className={clsxm(
					'p-3 px-5 flex space-x-2 input-border rounded-xl items-center text-sm',
					hook.filterType === 'status' && ['bg-gray-lighter'],
					'h-[2.75rem]'
				)}
				onClick={() => hook.toggleFilterType('status')}
			>
				<SettingFilterIcon className="dark:text-white w-3.5" strokeWidth="1.8" />
				<span>{t('common.FILTER')}</span>
			</button>

			{/* Assign task combobox */}
			<TaskUnOrAssignPopover
				onTaskClick={(task, close) => {
					setLoading(true);
					close();
					profile.assignTask(task).finally(() => setLoading(false));
				}}
				tasks={hook.tasksGrouped.unassignedTasks}
				buttonClassName="mb-0 h-full"
				onTaskCreated={(_, close) => close()}
				usersTaskCreatedAssignTo={profile.member?.employeeId ? [{ id: profile.member?.employeeId }] : undefined}
				userProfile={profile.member}
			>
				<Tooltip label={osSpecificAssignTaskTooltipLabel} placement="auto">
					<Button
						loading={loading}
						className={clsxm(
							'dark:bg-gradient-to-tl dark:from-regal-rose dark:to-regal-blue h-full px-4 py-3 rounded-xl text-base',
							'min-w-[11.25rem] h-[2.75rem]'
						)}
					>
						{t('common.ASSIGN_TASK')}
					</Button>
				</Tooltip>
			</TaskUnOrAssignPopover>
		</div>
	);
}

/* It's a function that returns a nav element. */
function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex justify-center md:justify-start items-center mt-4 space-x-1 w-full md:space-x-4 md:mt-0">
			{hook.tabs.map((item, i) => {
				const active = item.tab === hook.tab;

				return (
					<Tooltip key={i} placement="top-start" label={item.description} className="">
						<button
							onClick={() => hook.setTab(item.tab)}
							className={clsxm(
								`md:text-lg text-xs text-gray-500 font-normal outline-none md:py-[1.5rem] px-[2.5rem] relative mt-4 md:mt-0 w-full md:min-w-[10.625rem] flex flex-col md:flex-row gap-1 items-center `,
								active && ['text-primary dark:text-white']
							)}
						>
							{item.name}{' '}
							<span
								className={clsxm(
									'bg-gray-lighter p-1 px-2 text-xs rounded-md m-1',
									active && ['bg-primary dark:bg-[#47484D] text-white']
								)}
							>
								{item.count}
							</span>
							{active && (
								<div
									className={clsxm(
										'bg-primary dark:bg-white',
										'h-[0.1875rem] absolute -bottom-3 left-0 right-0 w-full'
									)}
								/>
							)}
						</button>
					</Tooltip>
				);
			})}
		</nav>
	);
}

/**
 * It renders a divider, a div with a flexbox layout, and filters buttons
 * @returns A React component
 */
export function TaskStatusFilter({ hook, employeeId }: { hook: I_TaskFilter; employeeId: string }) {
	const [key, setKey] = useState(0);
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center mt-4 space-x-2 md:justify-between md:flex-row pt-2 !z-20">
			<div className="flex flex-wrap justify-center flex-1 space-x-3 md:justify-start z-50">
				<TaskStatusDropdown
					key={key + 1}
					onValueChange={(_, values) => hook.onChangeStatusFilter('status', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskPropertiesDropdown
					key={key + 2}
					onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskSizesDropdown
					key={key + 3}
					onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskLabelsDropdown
					key={key + 4}
					onValueChange={(_, values) => hook.onChangeStatusFilter('label', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				{hook.tab === 'dailyplan' && <DailyPlanFilter employeeId={employeeId} />}

				<VerticalSeparator />
				<Button className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9" onClick={hook.applyStatusFilder}>
					{t('common.APPLY')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
					variant="grey"
					onClick={() => {
						setKey((k) => k + 1);
						hook.onResetStatusFilter();
					}}
				>
					{t('common.RESET')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
					variant="outline-danger"
					onClick={() => {
						hook.toggleFilterType('status');
					}}
				>
					{t('common.CLOSE')}
				</Button>
			</div>
		</div>
	);
}

/**
 * It renders a divider, a div with a flexbox layout, and filters buttons
 * @returns A React component
 */
export function TaskStatusFilterDailyFuture() {
	const [key, setKey] = useState(0);
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center mt-4 space-x-2 md:justify-between md:flex-row pt-2 z-10 bg-white px-2 rounded-sm">
			<div className="flex flex-wrap items-center !justify-center flex-1 space-x-3 md:justify-start z-50 w-full">
				<TaskStatusDropdown
					key={key + 1}
					// onValueChange={(_, values) => hook.onChangeStatusFilter('status', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskPropertiesDropdown
					key={key + 2}
					// onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskSizesDropdown
					key={key + 3}
					// onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<TaskLabelsDropdown
					key={key + 4}
					// onValueChange={(_, values) => hook.onChangeStatusFilter('label', values || [])}
					className="lg:min-w-[170px] mt-4 mb-2 lg:mt-0"
					multiple={true}
				/>

				<VerticalSeparator />
				<FiltersDatePickerWithRange className='lg:!min-w-[170px] mt-4 mb-2 lg:mt-0' />
				<VerticalSeparator />

				{/* {hook.tab === 'dailyplan' && <DailyPlanFilter employeeId={employeeId} />} */}

				<Button className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
				// onClick={hook.applyStatusFilder}
				>
					{t('common.APPLY')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-9"
					variant="grey"
					onClick={() => {
						setKey((k) => k + 1);
						// hook.onResetStatusFilter();
					}}
				>
					{t('common.RESET')}
				</Button>
			</div>
		</div>
	);
}


export function TaskNameFilter({
	value,
	setValue,
	close,
	fullWidth = false
}: {
	value: string;
	setValue: (v: string) => void;
	close: () => void;
	fullWidth?: boolean;
}) {
	const t = useTranslations();

	const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
	const [tempValue, setTempValue] = useState<string>(value);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setTempValue(inputValue);

		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		const newTimeout = setTimeout(() => {
			setValue(inputValue);
		}, 300);

		setTypingTimeout(newTimeout);
	};

	return (
		<div className={clsxm('flex flex-row w-full md:w-1/2 gap-2 mt-0 ml-auto', fullWidth && '!w-full')}>
			<InputField
				value={tempValue}
				autoFocus={true}
				onChange={(e) => handleInputChange(e)}
				placeholder={t('common.TYPE_SOMETHING') + '...'}
				wrapperClassName="mb-0 dark:bg-transparent !w-full rounded-xl"
			/>
			<Button className="py-1 md:px-3 px-1 min-w-[5rem] rounded-xl" variant="outline-danger" onClick={close}>
				{t('common.CLOSE')}
			</Button>
		</div>
	);
}
