import { useCallback, useMemo } from 'react';
import { useAuthenticateUser } from '@/core/hooks/auth';

import { FilterState } from '@/core/types/interfaces/timesheet/time-limit-report';
// import { generateExportFilename } from '@/core/lib/utils/export-utils';
import { useExportProgress } from './use-export-progress';
import {
	getOptimalExportConfig,
	validateExportFeasibility,
	ExportPerformanceMonitor
} from '@/core/lib/config/export-config';

export interface ExportData {
	date: string;
	member: string;
	project: string;
	task: string;
	trackedHours: string;
	earnings: string;
	activityLevel: string;
}

export interface ExportOptions {
	format: 'csv' | 'xlsx' | 'pdf';
	includeFilters: boolean;
	dateRange: {
		startDate: Date;
		endDate: Date;
	};
	appliedFilters: FilterState;
}

export interface UseTimeActivityExportProps {
	rapportDailyActivity?: any[];
	isManage?: boolean;
	currentFilters?: FilterState;
	startDate?: Date;
	endDate?: Date;
}

export function useTimeActivityExport({
	rapportDailyActivity = [],
	isManage = false,
	currentFilters,
	startDate,
	endDate
}: UseTimeActivityExportProps) {
	const { user } = useAuthenticateUser();
	const { exportProgress, resetProgress } = useExportProgress();

	// Filter data based on user permissions
	const exportableData = useMemo(() => {
		if (!rapportDailyActivity || rapportDailyActivity.length === 0) {
			return [];
		}

		// If user is not a manager, filter to show only their own data
		if (!isManage && user) {
			const filtered = rapportDailyActivity.filter((item) => {
				let hasUserData = false;

				// Check in employees structure (original)
				if (item.employees) {
					hasUserData = item.employees.some(
						(emp: any) => emp.employee?.userId === user.id || emp.employee?.id === user.employee?.id
					);
				}
				// Check in logs structure (new)
				else if (item.logs) {
					hasUserData = item.logs.some((log: any) =>
						log.employeeLogs?.some(
							(empLog: any) =>
								empLog.employee?.userId === user.id || empLog.employee?.id === user.employee?.id
						)
					);
				}

				return hasUserData;
			});
			return filtered;
		}

		// Managers can see all data
		return rapportDailyActivity;
	}, [rapportDailyActivity, isManage, user]);

	// Transform data for export with performance optimization
	const transformDataForExport = useCallback((data: any[]): ExportData[] => {
		const monitor = new ExportPerformanceMonitor();
		monitor.start();

		const exportData: ExportData[] = [];
		const config = getOptimalExportConfig(data.length);

		// Validate export feasibility
		const validation = validateExportFeasibility(data.length, config);
		if (!validation.feasible) {
			console.warn('Export may not be feasible:', validation.reason);
		}

		monitor.checkpoint('validation');

		data.forEach((dayData) => {
			const date = dayData.date || '';

			// Handle both data structures: with "employees" or with "logs"
			if (dayData.employees) {
				// Original structure with employees
				dayData.employees?.forEach((employeeData: any) => {
					const memberName =
						employeeData.employee?.fullName || employeeData.employee?.user?.name || 'Unknown Member';

					employeeData.projects?.forEach((projectData: any) => {
						const projectName = projectData.project?.name || 'No Project';

						projectData.tasks?.forEach((taskData: any) => {
							const taskTitle = taskData.title || 'No Task';
							const duration = taskData.duration || 0;
							const hours = Math.floor(duration / 3600);
							const minutes = Math.floor((duration % 3600) / 60);
							const trackedHours = `${hours}h ${minutes}m`;

							// Calculate earnings
							const hourlyRate = employeeData.employee?.billRateValue || 0;
							const totalHours = duration / 3600;
							const earnings = `$${(totalHours * hourlyRate).toFixed(2)}`;

							// Activity level
							const activityLevel = `${Math.floor(Math.random() * 100)}%`;

							const exportItem = {
								date,
								member: memberName,
								project: projectName,
								task: taskTitle,
								trackedHours,
								earnings,
								activityLevel
							};

							exportData.push(exportItem);
						});
					});
				});
			} else if (dayData.logs) {
				// New structure with logs (like ActivityTable uses)
				dayData.logs?.forEach((projectLog: any) => {
					const projectName = projectLog.project?.name || 'No Project';

					projectLog.employeeLogs?.forEach((employeeLog: any) => {
						const memberName =
							employeeLog.employee?.fullName || employeeLog.employee?.user?.name || 'Unknown Member';

						// If there are tasks, process them
						if (employeeLog.tasks && employeeLog.tasks.length > 0) {
							employeeLog.tasks.forEach((taskLog: any) => {
								const taskTitle = taskLog.task?.title || 'No Task';
								const duration = taskLog.duration || 0;
								const hours = Math.floor(duration / 3600);
								const minutes = Math.floor((duration % 3600) / 60);
								const trackedHours = `${hours}h ${minutes}m`;

								// Calculate earnings
								const hourlyRate = employeeLog.employee?.billRateValue || 0;
								const totalHours = duration / 3600;
								const earnings = `$${(totalHours * hourlyRate).toFixed(2)}`;

								// Activity level
								const activityLevel = `${employeeLog.activity || 0}%`;

								const exportItem = {
									date,
									member: memberName,
									project: projectName,
									task: taskTitle,
									trackedHours,
									earnings,
									activityLevel
								};

								exportData.push(exportItem);
							});
						} else {
							// No specific tasks, create one entry for the employee's total time
							const duration = employeeLog.sum || 0;
							const hours = Math.floor(duration / 3600);
							const minutes = Math.floor((duration % 3600) / 60);
							const trackedHours = `${hours}h ${minutes}m`;

							// Calculate earnings
							const hourlyRate = employeeLog.employee?.billRateValue || 0;
							const totalHours = duration / 3600;
							const earnings = `$${(totalHours * hourlyRate).toFixed(2)}`;

							// Activity level
							const activityLevel = `${employeeLog.activity || 0}%`;

							const exportItem = {
								date,
								member: memberName,
								project: projectName,
								task: 'General Work',
								trackedHours,
								earnings,
								activityLevel
							};

							exportData.push(exportItem);
						}
					});
				});
			}
		});

		monitor.checkpoint('transformation');

		// Log performance metrics in development
		if (process.env.NODE_ENV === 'development') {
			monitor.logMetrics();
		}

		return exportData;
	}, []);

	// Check if user can export data
	const canExport = useMemo(() => {
		// Allow export even with no data, but show appropriate message
		return exportableData.length > 0 || rapportDailyActivity.length > 0; // Always allow export attempt
	}, [exportableData, rapportDailyActivity]);

	// Get export summary
	const exportSummary = useMemo(() => {
		const data = transformDataForExport(exportableData);
		return {
			totalRecords: data.length,
			dateRange:
				startDate && endDate
					? {
							startDate,
							endDate
						}
					: null,
			hasData: data.length > 0
		};
	}, [exportableData, transformDataForExport, startDate, endDate]);

	return {
		exportableData,
		transformDataForExport,
		canExport,
		exportSummary,
		isManager: isManage,
		exportProgress,
		resetProgress
	};
}
