'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { I_UserProfilePage } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components';
import { Search } from '@/core/components/icons';
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { TaskLabelsDropdown, TaskPropertiesDropdown, TaskStatusDropdown } from '@/core/components/tasks/task-status';
import { useTranslations } from 'next-intl';
import { DailyPlanFilter } from '../../tasks/daily-plan/daily-plan-filter';

import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { dailyPlanVisibleTabsState } from '@/core/stores';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { TaskDatePickerWithRange } from '../../tasks/task-date-range';
import { DateRange } from 'react-day-picker';
import '@/styles/style.css';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { TaskFilterMenu } from './task-filter-menu';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { Tooltip } from '../../duplicated-components/tooltip';
import { InputField } from '../../duplicated-components/_input';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { TaskSizesDropdown } from '../../tasks/task-sizes-dropdown';
import { Tabs, TabsList, TabsTrigger } from '@/core/components/common/tabs';
import { TaskSearchField } from '@/core/components/tasks/task-search-field';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
export type ITab = 'worked' | 'assigned' | 'unassigned' | 'dailyplan' | 'stats';

export type I_TaskFilter = ReturnType<typeof useTaskFilter>;

const TAB_COUNT_CHIP_CLASS_NAME =
	'rounded-sm bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

const ACTIVE_TAB_COUNT_CHIP_CLASS_NAME = 'bg-primary/10 text-primary-ink';

/** A count the team's tasks have not given yet: a pulse in the chip, never a zero. */
const TAB_COUNT_PENDING_CLASS_NAME = 'inline-block h-2.5 w-3 animate-pulse rounded-sm bg-foreground/10 align-middle';

/** A count still growing while more pages of the team's tasks arrive: the number itself breathes, nothing is added. */
const TAB_COUNT_GROWING_CLASS_NAME = 'animate-pulse';

/** The tabs whose counts are read from the team's tasks, which arrive page by page. */
const TEAM_TASK_TABS: ReadonlySet<ITab> = new Set<ITab>(['worked', 'assigned', 'unassigned']);

type Props = { hook: I_TaskFilter; profile: I_UserProfilePage };

/**
 * The tab row of the profile and the controls of the list under it: the search and the filter menu. What the
 * viewer does for the person (add time, assign a task) sits in the identity band above.
 */
export function TaskFilter({ className, hook }: IClassName & Props) {
	const t = useTranslations();
	return (
		<div className="relative z-10 w-full">
			<div className={clsxm('flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
				<TabsNav hook={hook} />
				<div className="flex shrink-0 items-center gap-2 pb-2 max-md:w-full">
					<TaskSearchField
						value={hook.taskName}
						onChange={hook.setTaskName}
						placeholder={t('profile.page.SEARCH_TASKS')}
						focusKey={true}
						className="max-md:flex-1"
					/>
					<TaskFilterMenu hook={hook} />
				</div>
			</div>
		</div>
	);
}

/**
 * The underlined tabs of the profile, one sliding indicator, a quiet count chip per tab. A count pulses before the
 * team's tasks arrive, and carries a small pulsing dot while more pages of them are still coming, so a number that
 * grows reads as loading.
 */
function TabsNav({ hook }: { hook: I_TaskFilter }) {
	const t = useTranslations();
	const { isFirstLoad: isTasksFirstLoad, isLoadingMorePages } = useTeamTasksLoadState();
	return (
		<Tabs
			value={hook.tab}
			onValueChange={(tab) => hook.setTab(tab as ITab)}
			className="min-w-0 max-w-full gap-0 max-md:order-last max-md:w-full"
		>
			<TabsList className="w-auto gap-5 border-b-0">
				{hook.tabs.map((item) => {
					const active = item.tab === hook.tab;
					const countsTeamTasks = TEAM_TASK_TABS.has(item.tab);
					const isCountPending = countsTeamTasks && isTasksFirstLoad;
					const isCountGrowing = countsTeamTasks && isLoadingMorePages;

					return (
						<Tooltip key={item.tab} placement="top-start" label={item.description} className="">
							<TabsTrigger value={item.tab} className="shrink-0">
								{item.name}{' '}
								<span
									className={clsxm(
										TAB_COUNT_CHIP_CLASS_NAME,
										active && [ACTIVE_TAB_COUNT_CHIP_CLASS_NAME]
									)}
								>
									{isCountPending && <span className={TAB_COUNT_PENDING_CLASS_NAME} />}
									{!isCountPending && (
										<span className={clsxm(isCountGrowing && TAB_COUNT_GROWING_CLASS_NAME)}>
											{item.count}
										</span>
									)}
									{isCountGrowing && (
										<span className="sr-only">{t('profile.page.COUNT_STILL_LOADING')}</span>
									)}
								</span>
							</TabsTrigger>
						</Tooltip>
					);
				})}
			</TabsList>
		</Tabs>
	);
}
/**
 * The status filter panel: one row of property dropdowns, then Apply, Reset and Close.
 */
export function TaskStatusFilter({ hook, employeeId }: { hook: I_TaskFilter; employeeId: string }) {
	const [key, setKey] = useState(0);
	const t = useTranslations();
	// Use useLocalStorageState for consistent state management
	const [storedDailyPlanTab] = useLocalStorageState<string>('daily-plan-tab', 'Future Tasks');
	// Follow the tab UserProfilePlans shows: the stored value is only read on mount and goes stale on tab switches
	const dailyPlanTab = useAtomValue(dailyPlanVisibleTabsState)[employeeId] ?? storedDailyPlanTab;

	// Get plans data from useEmployeeDailyPlans instead of useDateRange to avoid global atom conflicts
	const { employeeSortedPlans, employeeFuturePlans, employeePastPlans } = useEmployeeDailyPlans(employeeId);
	const { date, setDate } = useDateRange(dailyPlanTab, employeeId);

	// Map tab names to their corresponding plan data
	const mapFilter: Record<string, typeof employeeFuturePlans> = {
		'Future Tasks': employeeFuturePlans,
		'Past Tasks': employeePastPlans,
		'All Tasks': employeeSortedPlans
	};

	// Determine which plan data to use based on the current tab
	const planData = mapFilter[dailyPlanTab] ?? employeeSortedPlans;

	return (
		<div className="flex flex-col items-center py-3 md:flex-row md:justify-between">
			<div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-start">
				<TaskStatusDropdown
					key={key + 1}
					onValueChange={(_, values) => hook.onChangeStatusFilter('status', values || [])}
					className="min-w-fit lg:max-w-[170px] h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskPropertiesDropdown
					key={key + 2}
					onValueChange={(_, values) => hook.onChangeStatusFilter('priority', values || [])}
					className="min-w-fit lg:max-w-[170px] h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskSizesDropdown
					key={key + 3}
					onValueChange={(_, values) => hook.onChangeStatusFilter('size', values || [])}
					className="min-w-fit lg:max-w-[170px] h-7"
					multiple={true}
					isMultiple={false}
				/>

				<TaskLabelsDropdown
					key={key + 4}
					onValueChange={(_, values) => hook.onChangeStatusFilter('label', values || [])}
					className="min-w-fit lg:max-w-[170px] h-7 !rounded-md text-foreground bg-foreground/5"
					multiple={true}
					isMultiple={false}
				/>

				{hook.tab === 'dailyplan' && <DailyPlanFilter employeeId={employeeId} />}
				{['Future Tasks', 'Past Tasks', 'All Tasks'].includes(dailyPlanTab) && (
					<TaskDatePickerWithRange
						data={planData}
						date={date}
						onSelect={(range: DateRange | undefined) => setDate(range)}
						label="Planned date"
						className="min-w-fit lg:max-w-[170px] h-7"
						contentClassName="h-7"
					/>
				)}
				<VerticalSeparator className="h-4 self-center" />

				<Button size="sm" className="min-w-[6.25rem]" onClick={hook.applyStatusFilter}>
					{t('common.APPLY')}
				</Button>
				<Button
					size="sm"
					className="min-w-[6.25rem]"
					variant="outline"
					onClick={() => {
						setKey((k) => k + 1);
						hook.onResetStatusFilter();
					}}
				>
					{t('common.RESET')}
				</Button>
				<Button
					size="sm"
					className="min-w-[6.25rem]"
					variant="ghost"
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
	fullWidth = false,
	className
}: {
	value: string;
	setValue: (v: string) => void;
	close: () => void;
	fullWidth?: boolean;
	className?: string;
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
		<div className={clsxm('ml-auto flex w-full flex-row gap-2 py-3 md:w-1/2', fullWidth && '!w-full', className)}>
			<InputField
				value={tempValue}
				autoFocus={true}
				onChange={(e) => handleInputChange(e)}
				placeholder={t('common.TYPE_SOMETHING') + '...'}
				leadingNode={<Search className="ml-2.5 size-4 text-muted-foreground" />}
				wrapperClassName="mb-0 !w-full"
				className="h-8 px-2"
			/>
			<Button className="min-w-[5rem]" variant="outline" size="default" onClick={close}>
				{t('common.CLOSE')}
			</Button>
		</div>
	);
}
