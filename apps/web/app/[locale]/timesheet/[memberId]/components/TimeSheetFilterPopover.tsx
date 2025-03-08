import React from 'react';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { Button } from '@components/ui/button';
import { MultiSelect } from 'lib/components/custom-select';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { SettingFilterIcon } from '@/assets/svg';
import { useTranslations } from 'next-intl';
import { useTimelogFilterOptions } from '@/app/hooks';
import { useTimesheet } from '@/app/hooks/features/useTimesheet';
import { cn } from '@/lib/utils';
import { statusTable } from './TimesheetAction';

/** Represents a generic filter item with required id and label properties */
interface FilterItem {
	id: string;
	label?: string;
	[key: string]: any;
}

/** Component for filtering timesheet entries by various criteria */

export const TimeSheetFilterPopover = React.memo(function TimeSheetFilterPopover() {
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);
	const { activeTeam } = useOrganizationTeams();
	const { organizationProjects } = useOrganizationProjects();

	const { tasks } = useTeamTasks();
	const t = useTranslations();
	const { setEmployeeState, setProjectState, setStatusState, setTaskState, employee, project, statusState, task } =
		useTimelogFilterOptions();
	const { timesheet, statusTimesheet, isManage } = useTimesheet({})

	React.useEffect(() => {
		if (shouldRemoveItems) {
			setShouldRemoveItems(false);
		}
	}, [shouldRemoveItems]);
	// Calculate total number of items in the timesheet
	const totalItems = React.useMemo(() => 
		statusTimesheet ? Object.values(statusTimesheet).reduce((sum, status) => sum + status.length, 0) : 0
	, [statusTimesheet]);

	// Calculate total number of active filters
	const totalFilteredItems = React.useMemo(() => 
		[employee, project, task, statusState].reduce((total, items) => total + (items?.length || 0), 0)
	, [employee, project, task, statusState]);

	const [filteredCount, setFilteredCount] = React.useState(0);

	const filteredResults = React.useMemo(() => {
		if (!timesheet || !statusTimesheet) return [];

		return timesheet.filter((item) => {
			const taskData = item.tasks[0];
			if (!taskData) return false;

			const matchesEmployee = !employee?.length || employee.some(emp => emp.employeeId === taskData.employee.id);
			const matchesProject = !project?.length || project.some(proj => proj.id === taskData.projectId);
			const matchesTask = !task?.length || task.some(t => t.id === taskData.taskId);
			const matchesStatus = !statusState?.length || statusState.some(status => status.label === taskData.timesheet.status);

			return matchesEmployee && matchesProject && matchesTask && matchesStatus;
		});
	}, [timesheet, employee, project, task, statusState, statusTimesheet]);

	React.useEffect(() => {
		setFilteredCount(filteredResults.length);
	}, [filteredResults]);

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="flex items-center justify-center  h-[2.2rem] rounded-lg bg-white dark:bg-dark--theme-light border dark:border-gray-700 hover:bg-white p-3 gap-2"
					>
						<SettingFilterIcon className="text-gray-700 dark:text-white w-3.5" strokeWidth="1.8" />
						<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						{filteredCount && totalFilteredItems > 0 && (
							<span
								role="status"
								aria-label={`${totalItems} items filtered`}
								className="rounded-full bg-primary dark:bg-primary-light h-7 w-7 flex items-center justify-center text-white text-center text-[12px]"
							>
								{totalItems > 100 ? '100+' : totalItems}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96">
					<div className="flex flex-col w-full">
						<div className="flex gap-2 mb-3 text-xl font-bold">
							<SettingFilterIcon className="w-4 text-gray-700 dark:text-white" strokeWidth="1.8" />
							<span className="text-gray-700 dark:text-white">{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							{isManage && (
								<div className="">
									<label className="flex justify-between mb-1 text-sm text-gray-600">
										<span className="text-[12px]">{t('manualTime.EMPLOYEE')}</span>
										<span
											className={cn(
												'text-primary/10',
												employee?.length > 0 && 'text-primary dark:text-primary-light'
											)}
										>
											{t('common.CLEAR')}
										</span>
									</label>
									<MultiSelect
										localStorageKey="timesheet-select-filter-employee"
										removeItems={shouldRemoveItems}
										items={activeTeam?.members ?? []}
										itemToString={(member) => member?.employee?.fullName ?? ''}
										itemId={(item) => item?.id ?? ''}
										onValueChange={setEmployeeState}
										multiSelect
										triggerClassName="dark:border-gray-700"
									/>
								</div>
							)}
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('sidebar.PROJECTS')}</span>
									<span
										className={cn(
											'text-primary/10',
											project?.length > 0 && 'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-projects"
									removeItems={shouldRemoveItems}
									items={organizationProjects ?? []}
									itemToString={(project) => project?.name ?? ''}
									itemId={(item) => item?.id ?? ''}
									onValueChange={setProjectState}
									multiSelect
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('hotkeys.TASK')}</span>
									<span
										className={cn(
											'text-primary/10',
											task?.length > 0 && 'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-task"
									removeItems={shouldRemoveItems}
									items={tasks}
									itemToString={(task) => task?.title ?? ''}
									itemId={(task) => task?.id ?? ''}
									onValueChange={setTaskState}
									multiSelect
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="">
								<label className="flex justify-between mb-1 text-sm text-gray-600">
									<span className="text-[12px]">{t('common.STATUS')}</span>
									<span
										className={cn(
											'text-primary/10',
											statusState && 'text-primary dark:text-primary-light'
										)}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-status"
									removeItems={shouldRemoveItems}
									items={statusTable?.flat() ?? []}
									itemToString={(status) => status?.label ?? ''}
									itemId={(item) => item?.label ?? ''}
									onValueChange={setStatusState}
									multiSelect
									triggerClassName="dark:border-gray-700"
								/>
							</div>
							<div className="flex gap-x-4 justify-end items-center w-full">
								<Button
									onClick={() => setShouldRemoveItems(true)}
									variant={'outline'}
									className="flex justify-center items-center h-10 text-sm rounded-lg dark:text-gray-300"
								>
									<span className="text-sm">{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button className="flex justify-center items-center h-10 text-sm rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300">
									<span className="text-sm">{t('common.APPLY_FILTER')}</span>
								</Button>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
});
