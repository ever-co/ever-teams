import React from 'react';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@/core/hooks';
import { Button } from '@/core/components/common/button2';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SettingFilterIcon } from '@/assets/svg';
import { useTranslations } from 'next-intl';
import { useTimelogFilterOptions } from '@/core/hooks';
import { useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { cn } from '@/core/lib/helpers';
import { statusTable } from './timesheet-action';
import { MultiSelect } from '../common/multi-select';

export const TimeSheetFilterPopover = React.memo(function TimeSheetFilterPopover() {
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);
	const { activeTeam } = useOrganizationTeams();
	const { organizationProjects } = useOrganizationProjects();

	const { tasks } = useTeamTasks();
	const t = useTranslations();
	const { setEmployeeState, setProjectState, setStatusState, setTaskState, employee, project, statusState, task } =
		useTimelogFilterOptions();
	const { timesheet, statusTimesheet, isManage } = useTimesheet({});

	React.useEffect(() => {
		if (shouldRemoveItems) {
			setShouldRemoveItems(false);
		}
	}, [shouldRemoveItems]);

	const totalItems = React.useMemo(() => {
		if (!statusTimesheet) return 0;
		return Object.values(statusTimesheet).reduce((sum, status) => sum + status.length, 0);
	}, [statusTimesheet]);

	const totalFilteredItems = React.useMemo(() => {
		let total = 0;
		if (employee?.length) total += employee.length;
		if (project?.length) total += project.length;
		if (task?.length) total += task.length;
		if (statusState?.length) total += statusState.length;
		return total;
	}, [employee, project, task, statusState]);

	const [filteredCount, setFilteredCount] = React.useState(0);

	interface TaskData {
		tasks: Array<{
			employee: { id: string };
			projectId: string;
			taskId: string;
			timesheet: { status: string };
		}>;
	}

	// Memoize filter criteria maps for O(1) lookup
	const employeeMap = React.useMemo(() => new Set(employee?.map((emp) => emp.employeeId)), [employee]);

	const projectMap = React.useMemo(() => new Set(project?.map((proj) => proj.id)), [project]);

	const taskMap = React.useMemo(() => new Set(task?.map((t) => t.id)), [task]);

	const statusMap = React.useMemo(() => new Set(statusState?.map((status) => status.label)), [statusState]);

	const getFilteredResults = React.useCallback(
		(data: TaskData[] | null | undefined): TaskData[] => {
			if (!Array.isArray(data)) return [];

			return data.filter((item) => {
				try {
					const taskData = item.tasks[0];
					if (
						!taskData?.employee?.id ||
						!taskData.projectId ||
						!taskData.taskId ||
						!taskData.timesheet?.status
					) {
						return false;
					}

					const matchesEmployee = !employeeMap.size || employeeMap.has(taskData.employee.id);
					const matchesProject = !projectMap.size || projectMap.has(taskData.projectId);
					const matchesTask = !taskMap.size || taskMap.has(taskData.taskId);
					const matchesStatus = !statusMap.size || statusMap.has(taskData.timesheet.status);

					return matchesEmployee && matchesProject && matchesTask && matchesStatus;
				} catch (error) {
					console.error('Error filtering timesheet item:', error);
					return false;
				}
			});
		},
		[employeeMap, projectMap, taskMap, statusMap]
	);

	React.useEffect(() => {
		if (timesheet && statusTimesheet) {
			const filteredResults = getFilteredResults(timesheet);
			setFilteredCount(filteredResults.length);
		}
	}, [timesheet, statusTimesheet, getFilteredResults]);

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
										itemToString={(members) => (members ? members.employee.fullName : '')}
										itemId={(item) => item.id}
										onValueChange={(selectedItems) => setEmployeeState(selectedItems as any)}
										multiSelect={true}
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
									itemToString={(project) =>
										(organizationProjects && project ? project.name : '') || ''
									}
									itemId={(item) => item.id}
									onValueChange={(selectedItems) => setProjectState(selectedItems as any)}
									multiSelect={true}
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
									onValueChange={(selectedItems) => setTaskState(selectedItems as any)}
									itemId={(task) => (task ? task.id : '')}
									itemToString={(task) => (task ? task.title : '')}
									multiSelect={true}
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
									items={statusTable?.flat()}
									itemToString={(status) => (status ? status.label : '')}
									itemId={(item) => item.label}
									onValueChange={(selectedItems) => setStatusState(selectedItems as any)}
									multiSelect={true}
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
