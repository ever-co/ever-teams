import { I_UserProfilePage } from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Transition } from '@headlessui/react';
import {
	Button,
	Divider,
	InputField,
	Tooltip,
	VerticalSeparator,
} from 'lib/components';
import { SearchNormalIcon, Settings4Icon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useCallback, useState } from 'react';
import {
	TaskLabelsDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
	TaskStatusDropdown,
} from './task-status';

type ITab = 'worked' | 'assigned' | 'unassigned';
type ITabs = {
	tab: ITab;
	name: string;
	count: number;
	description: string;
};

type FilterType = 'status' | 'search' | undefined;
/**
 * It returns an object with the current tab, a function to set the current tab, and an array of tabs
 * @param {I_UserProfilePage} hook - I_UserProfilePage - this is the hook that we're using in the
 * component.
 */
export function useTaskFilter(profile: I_UserProfilePage) {
	const { trans } = useTranslation();
	const [tab, setTab] = useState<ITab>('worked');
	const [filterType, setFilterType] = useState<FilterType>(undefined);

	const tabs: ITabs[] = [
		{
			tab: 'worked',
			name: trans.common.WORKED,
			description: trans.task.tabFilter.WORKED_DESCRIPTION,
			count: profile.tasksFiltered.workedTasks.length,
		},
		{
			tab: 'assigned',
			name: trans.common.ASSIGNED,
			description: trans.task.tabFilter.ASSIGNED_DESCRIPTION,
			count: profile.tasksFiltered.assignedTasks.length,
		},
		{
			tab: 'unassigned',
			name: trans.common.UNASSIGNED,
			description: trans.task.tabFilter.UNASSIGNED_DESCRIPTION,
			count: profile.tasksFiltered.unassignedTasks.length,
		},
	];

	const tasksFiltered: { [x in ITab]: ITeamTask[] } = {
		unassigned: profile.tasksFiltered.unassignedTasks,
		assigned: profile.tasksFiltered.assignedTasks,
		worked: profile.tasksFiltered.workedTasks,
	};

	const toggleFilterType = useCallback(
		(type: NonNullable<FilterType>) => {
			setFilterType((flt) => {
				return flt === type ? undefined : type;
			});
		},
		[setFilterType]
	);

	return {
		tab,
		setTab,
		tabs,
		filterType,
		toggleFilterType,
		tasksFiltered: tasksFiltered[tab],
	};
}
export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

/**
 * It's a wrapper for two components, one of which is a wrapper for another component
 * @param  - IClassName & { hook: I_TaskFilter }
 * @returns A div with a className of 'flex justify-between' and a className of whatever is passed in.
 */
export function TaskFilter({
	className,
	hook,
}: IClassName & { hook: I_TaskFilter }) {
	return (
		<>
			<div className={clsxm('flex justify-between', className)}>
				<TabsNav hook={hook} />
				<InputFilters hook={hook} />
			</div>

			{/*  It's a transition component that is used to animate the transition of the TaskStatusFilter
		component. */}
			<Transition
				show={hook.filterType !== undefined}
				enter="transition-opacity duration-75"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-75"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				<Divider className="mt-4" />
				{hook.filterType === 'status' && <TaskStatusFilter />}
				{hook.filterType === 'search' && <TaskNameFilter />}
			</Transition>
		</>
	);
}

/**
 * It renders a search icon, a vertical separator, a filter button, and an assign task button
 * @returns A div with a button, a vertical separator, a button, and a button.
 */
function InputFilters({ hook }: { hook: I_TaskFilter }) {
	const { trans } = useTranslation();

	return (
		<div className="flex space-x-5 items-center">
			<button
				className={clsxm('outline-none')}
				onClick={() => hook.toggleFilterType('search')}
			>
				<SearchNormalIcon
					className={clsxm(
						'dark:stroke-white',
						hook.filterType === 'search' && [
							'stroke-primary-light dark:stroke-primary-light',
						]
					)}
				/>
			</button>

			<VerticalSeparator />

			<button
				className={clsxm(
					'p-3 px-5 flex space-x-2 input-border rounded-xl items-center',
					hook.filterType === 'status' && ['bg-gray-lighter']
				)}
				onClick={() => hook.toggleFilterType('status')}
			>
				<Settings4Icon className="dark:stroke-white" />
				<span>{trans.common.FILTER}</span>
			</button>

			<Button className="dark:bg-gradient-to-tl dark:from-regal-rose dark:to-regal-blue">
				{trans.common.ASSIGN_TASK}
			</Button>
		</div>
	);
}

/* It's a function that returns a nav element. */
function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex space-x-4">
			{hook.tabs.map((item, i) => {
				const active = item.tab === hook.tab;
				return (
					<Tooltip key={i} placement="top-start" label={item.description}>
						<button
							onClick={() => hook.setTab(item.tab)}
							className={clsxm(
								'text-lg text-gray-500 font-normal outline-none p-3 relative',
								active && ['text-primary dark:text-primary-light']
							)}
						>
							{item.name}{' '}
							<span
								className={clsxm(
									'bg-gray-lighter p-1 px-2 text-xs rounded-md',
									active && ['bg-primary dark:bg-primary-light text-white']
								)}
							>
								{item.count}
							</span>
							{active && (
								<div
									className={clsxm(
										'bg-primary dark:bg-primary-light',
										'h-[2px] absolute -bottom-4 left-0 right-0 w-full'
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
function TaskStatusFilter() {
	const { trans } = useTranslation();

	return (
		<div className="mt-4 flex justify-between space-x-2 items-center">
			<div className="flex-1 flex space-x-3">
				<TaskStatusDropdown className="lg:min-w-[170px]" />

				<TaskPropertiesDropdown className="lg:min-w-[170px]" />

				<TaskSizesDropdown className="lg:min-w-[170px]" />

				<TaskLabelsDropdown className="lg:min-w-[170px]" />
			</div>

			<div className="flex space-x-3">
				<Button className="py-2 min-w-[100px]">{trans.common.APPLY}</Button>
				<Button className="py-2 min-w-[100px]" variant="grey">
					{trans.common.RESET}
				</Button>
			</div>
		</div>
	);
}

function TaskNameFilter() {
	return (
		<div className="mt-3 w-1/2 ml-auto">
			<InputField placeholder="Type something..." />
		</div>
	);
}
