'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { I_UserProfilePage, useModal } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Transition } from '@headlessui/react';
import { Button } from '@/core/components';
import { SearchNormalIcon } from 'assets/svg';
import { useState } from 'react';
import { TaskUnOrAssignPopover } from '../../features/tasks/task-assign-popover';
import { TaskLabelsDropdown, TaskPropertiesDropdown, TaskStatusDropdown } from '@/core/components/tasks/task-status';
import { useTranslations } from 'next-intl';
import { SettingFilterIcon } from 'assets/svg';
import { DailyPlanFilter } from '../../tasks/daily-plan/daily-plan-filter';
import { Divider } from '@/core/components';

import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { TaskDatePickerWithRange } from '../../tasks/task-date-range';
import { DateRange } from 'react-day-picker';
import '@/styles/style.css';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { Tooltip } from '../../duplicated-components/tooltip';
import { InputField } from '../../duplicated-components/_input';
import { AddManualTimeModal } from '../../features/manual-time/add-manual-time-modal';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { TaskSizesDropdown } from '../../tasks/task-sizes-dropdown';

export type ITab = 'worked' | 'assigned' | 'unassigned' | 'dailyplan' | 'stats';

export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

/**
 * It's a wrapper for two components, one of which is a wrapper for another component
 * @param  - IClassName & { hook: I_TaskFilter }
 * @returns A div with a className of 'flex justify-between' and a className of whatever is passed in.
 */

type Props = { hook: I_TaskFilter; profile: I_UserProfilePage };
export function TaskFilter({ className, hook, profile }: IClassName & Props) {
	return (
		<div className="relative z-10 w-full">
			<div
				className={clsxm(
					'flex flex-col flex-wrap-reverse justify-between items-center w-full xs:flex-row lg:flex-nowrap',
					className
				)}
			>
				<TabsNav hook={hook} />
				<InputFilters profile={profile} hook={hook} />
			</div>

			{/*  It's a transition component that is used to animate the transition of the TaskStatusFilter
		component. */}
			<Transition
				as="div"
				show={hook.filterType !== undefined}
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0 ease-out"
				className="mt-5 w-full"
				ref={hook.tab !== 'dailyplan' ? hook.outclickFilterCard.targetEl : null}
			>
				{hook.filterType !== undefined && <Divider className="mt-1" />}
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

	const {
		isOpen: isManualTimeModalOpen,
		openModal: openManualTimeModal,
		closeModal: closeManualTimeModal
	} = useModal();

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
			<Button
				onClick={() => openManualTimeModal()}
				className={clsxm(
					'bg-primary text-white dark:border-from-regal-rose dark:border-to-regal-blue dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-tl  dark:from-regal-rose dark:to-regal-blue h-full px-4 py-3 rounded-xl text-base flex items-center space-x-1 dark:border-gradient-dark dark:border-regal-rose dark:border',
					'min-w-[8.25rem] w-fit h-[2.75rem] !text-nowrap whitespace-nowrap'
				)}
			>
				<span className="text-xl">+</span>
				{t('common.ADD_TIME')}
			</Button>

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
							'min-w-[8.25rem] h-[2.75rem]'
						)}
					>
						{t('common.ASSIGN_TASK')}
					</Button>
				</Tooltip>
			</TaskUnOrAssignPopover>
			<AddManualTimeModal closeModal={closeManualTimeModal} isOpen={isManualTimeModalOpen} params="AddTime" />
		</div>
	);
}

/* It's a function that returns a nav element. */
function TabsNav({ hook }: { hook: I_TaskFilter }) {
	return (
		<nav className="flex gap-1 justify-center items-center -mb-1 w-full md:justify-start md:gap-4 md:mt-0">
			{hook.tabs.map((item, i) => {
				const active = item.tab === hook.tab;

				return (
					<Tooltip key={i} placement="top-start" label={item.description} className="">
						<button
							onClick={() => hook.setTab(item.tab)}
							className={clsxm(
								`md:text-lg text-xs text-gray-500 font-normal outline-none px-[1rem] relative mt-4 md:mt-0 w-full md:min-w-[10.625rem] flex flex-col md:flex-row gap-1 items-center `,
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
										'h-[0.1875rem] absolute -bottom-8 left-0 right-0 w-full'
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
	// Use useLocalStorageState for consistent state management
	const [dailyPlanTab] = useLocalStorageState<string>('daily-plan-tab', 'Future Tasks');
	const { date, setDate, data } = useDateRange(dailyPlanTab);
	return (
		<div className="flex flex-col items-center pt-2 mt-4 space-x-2 md:justify-between md:flex-row">
			<div className="flex flex-wrap flex-1 justify-center mb-2 space-x-3 h-9 md:justify-start">
				<TaskStatusDropdown
					key={key + 1}
					onValueChange={(_, values) => hook.onChangeStatusFilter('status', values || [])}
					className="min-w-fit lg:max-w-[170px] mt-4 mb-2 lg:mb-0 lg:mt-0 h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskPropertiesDropdown
					key={key + 2}
					onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
					className="min-w-fit lg:max-w-[170px] mt-4 mb-2 lg:mb-0 lg:mt-0 h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskSizesDropdown
					key={key + 3}
					onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
					className="min-w-fit lg:max-w-[170px] mt-4 mb-2 lg:mb-0 lg:mt-0 h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskLabelsDropdown
					key={key + 4}
					onValueChange={(_, values) => hook.onChangeStatusFilter('label', values || [])}
					className="min-w-fit lg:max-w-[170px] mt-4 mb-2 lg:mb-0 lg:mt-0 h-7 !rounded-[8px] text-dark dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light"
					multiple={true}
					isMultiple={false}
				/>

				{hook.tab === 'dailyplan' && <DailyPlanFilter employeeId={employeeId} />}
				{['Future Tasks', 'Past Tasks', 'All Tasks'].includes(dailyPlanTab) && (
					<TaskDatePickerWithRange
						data={data.data}
						date={date}
						onSelect={(range: DateRange | undefined) => setDate(range)}
						label="Planned date"
						className="min-w-fit lg:max-w-[170px] mt-4 mb-2 lg:mb-0 lg:mt-0 h-7"
						contentClassName="h-7"
					/>
				)}
				<VerticalSeparator />

				<Button className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-7" onClick={hook.applyStatusFilter}>
					{t('common.APPLY')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-7"
					variant="grey"
					onClick={() => {
						setKey((k) => k + 1);
						hook.onResetStatusFilter();
					}}
				>
					{t('common.RESET')}
				</Button>
				<Button
					className="py-2 md:px-3 px-2 min-w-[6.25rem] rounded-xl h-7"
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
		<div className={clsxm('flex flex-row w-full md:w-1/2 gap-2 mt-0 ml-auto my-6', fullWidth && '!w-full')}>
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
