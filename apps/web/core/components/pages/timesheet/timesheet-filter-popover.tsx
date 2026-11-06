import React from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Filter } from '@/core/components/icons';
import { useTranslations } from 'next-intl';
import { useTimelogFilterOptions } from '@/core/hooks';
import { useTimesheetQuery } from '@/core/hooks/timesheet/use-timesheet-query';
import { cn } from '@/core/lib/helpers';
import { statusTable } from '../../timesheet/timesheet-action';
import { MultiSelect } from '../../common/multi-select';
import { useAtomValue } from 'jotai';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';

export const TimeSheetFilterPopover = React.memo(function TimeSheetFilterPopover() {
	const [shouldRemoveItems, setShouldRemoveItems] = React.useState(false);

	const activeTeam = useAtomValue(activeTeamState);

	const { organizationProjects } = useOrganizationProjectsQuery();
	const tasks = useAtomValue(tasksByTeamState);

	const t = useTranslations();
	const { setEmployeeState, setProjectState, setStatusState, setTaskState, employee, project, statusState, task } =
		useTimelogFilterOptions();
	const { timesheetElementGroup: timesheet, statusTimesheet, isManage } = useTimesheetQuery({});

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
			const filteredResults = getFilteredResults(timesheet as any);
			setFilteredCount(filteredResults.length);
		}
	}, [timesheet, statusTimesheet, getFilteredResults]);

	const hasFilteredItems = filteredCount > 0 && totalFilteredItems > 0;

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" size="default">
						<Filter className="text-muted-foreground" />
						<span>{t('common.FILTER')}</span>
						{hasFilteredItems && (
							<span
								role="status"
								aria-label={`${totalItems} items filtered`}
								className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular-nums text-primary-ink"
							>
								{totalItems > 100 ? '100+' : totalItems}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96">
					<div className="flex flex-col w-full">
						<div className="flex items-center gap-2 mb-3 text-sm font-semibold">
							<Filter className="size-4 text-muted-foreground" />
							<span>{t('common.FILTER')}</span>
						</div>
						<div className="grid gap-5">
							{isManage && (
								<div className="">
									<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
										<span>{t('manualTime.EMPLOYEE')}</span>
										<span
											className={cn(
												'text-foreground/25',
												employee?.length > 0 && 'text-primary-ink'
											)}
										>
											{t('common.CLEAR')}
										</span>
									</label>
									<MultiSelect
										localStorageKey="timesheet-select-filter-employee"
										items={activeTeam?.members ?? []}
										itemToString={(members) => (members ? members?.employee?.fullName || '' : '')}
										itemId={(item) => item.id}
										onValueChange={(selectedItems) => setEmployeeState(selectedItems as any)}
										multiSelect={true}
									/>
								</div>
							)}
							<div className="">
								<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
									<span>{t('sidebar.PROJECTS')}</span>
									<span
										className={cn('text-foreground/25', project?.length > 0 && 'text-primary-ink')}
									>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-projects"
									items={organizationProjects}
									itemToString={(project) =>
										(organizationProjects && project ? project.name : '') || ''
									}
									itemId={(item) => item.id}
									onValueChange={(selectedItems) => setProjectState(selectedItems as any)}
									multiSelect={true}
								/>
							</div>
							<div className="">
								<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
									<span>{t('hotkeys.TASK')}</span>
									<span className={cn('text-foreground/25', task?.length > 0 && 'text-primary-ink')}>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-task"
									items={tasks}
									onValueChange={(selectedItems) => setTaskState(selectedItems as any)}
									itemId={(task) => (task ? task.id : '')}
									itemToString={(task) => (task ? task.title : '')}
									multiSelect={true}
								/>
							</div>
							<div className="">
								<label className="flex items-center justify-between mb-1.5 text-xs font-medium text-muted-foreground">
									<span>{t('common.STATUS')}</span>
									<span className={cn('text-foreground/25', statusState && 'text-primary-ink')}>
										{t('common.CLEAR')}
									</span>
								</label>
								<MultiSelect
									localStorageKey="timesheet-select-filter-status"
									items={statusTable?.flat()}
									itemToString={(status) => (status ? status.label : '')}
									itemId={(item) => item.label}
									onValueChange={(selectedItems) => setStatusState(selectedItems as any)}
									multiSelect={true}
								/>
							</div>
							<div className="flex gap-x-2 justify-end items-center w-full">
								<Button onClick={() => setShouldRemoveItems(true)} variant={'outline'} size="lg">
									<span>{t('common.CLEAR_FILTER')}</span>
								</Button>
								<Button size="lg">
									<span>{t('common.APPLY_FILTER')}</span>
								</Button>
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
});
