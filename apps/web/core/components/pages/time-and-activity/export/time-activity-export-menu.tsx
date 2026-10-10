'use client';

import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useTimeActivityExport, DailyActivityReport } from '@/core/hooks/activities/use-time-activity-export';
import { FilterState } from '@/core/types/interfaces/timesheet/time-limit-report';
import {
	ITimeLogGroupedDailyReport,
	ITimerProjectLog,
	ITimerEmployeeLog,
	ITimerTaskLog
} from '@/core/types/interfaces/activity/activity-report';
import { ExportPDFSkeleton } from '@/core/components/common/skeleton/export-pdf-skeleton';
import { TimeActivityPDF, TimeActivityByMemberPDF } from './index';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { ExportProgressModal } from './export-progress-modal';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { exportToXLSX, generateExportFilename } from '@/core/lib/utils/export-utils';
import { logErrorInDev } from '@/core/lib/helpers/error-message';

/**
 * Type guard to check if the item has the new "logs" structure
 */
function hasLogsStructure(item: DailyActivityReport): item is ITimeLogGroupedDailyReport {
	return 'logs' in item && item.logs !== undefined;
}

export interface TimeActivityExportMenuProps {
	rapportDailyActivity?: DailyActivityReport[];
	isManage?: boolean;
	currentFilters?: FilterState;
	startDate?: Date;
	endDate?: Date;
	groupByType?: GroupByType;
	buttonClassName?: string;
}

interface ExportRow {
	date: string;
	member: string;
	project: string;
	task: string;
	status: string;
	trackedHours: string;
	earnings: string;
	activityLevel: string;
	// Raw values behind the three strings above, so the XLSX cells stay numbers a spreadsheet can sum
	durationSeconds: number;
	earningsAmount: number;
	activityPercent: number;
}

// Using existing types from activity-report.ts
// No need for custom interfaces as we use ITimerProjectLog, ITimerEmployeeLog, ITimerTaskLog
export function TimeActivityExportMenu({
	rapportDailyActivity = [],
	isManage = false,
	currentFilters,
	startDate,
	endDate,
	groupByType = 'daily',
	buttonClassName = 'w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light py-1 h-9'
}: TimeActivityExportMenuProps) {
	const t = useTranslations();
	const [showProgressModal, setShowProgressModal] = useState(false);
	const [currentExportType, setCurrentExportType] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
	// Id of the export the modal follows: a run the user closed or replaced cannot overwrite the newer one
	const activeExportIdRef = useRef(0);

	const { exportableData, resetProgress, exportSummary, exportProgress, startExport, setError, setSuccess } =
		useTimeActivityExport({
			rapportDailyActivity,
			isManage,
			currentFilters,
			startDate,
			endDate
		});

	// Check if we have data to export
	const hasData = exportableData && exportableData.length > 0;

	// Get default date range (This Month - same as the page default)
	const getDefaultDateRange = useCallback(() => {
		const today = new Date();
		return {
			from: startOfMonth(today),
			to: endOfMonth(today)
		};
	}, []);

	// Use provided dates or default to "This Month"
	const effectiveStartDate = startDate || getDefaultDateRange().from;
	const effectiveEndDate = endDate || getDefaultDateRange().to;

	// Format dates for display
	const formatDate = useCallback((date: Date): string => {
		return date.toLocaleDateString('en-US', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}, []);

	const formattedStartDate = formatDate(effectiveStartDate);
	const formattedEndDate = formatDate(effectiveEndDate);

	// Prepare export options
	const exportOptions = useMemo(
		() => ({
			format: 'csv' as const,
			includeFilters: true,
			dateRange: {
				startDate: effectiveStartDate,
				endDate: effectiveEndDate
			},
			appliedFilters: currentFilters || { teams: [], members: [], projects: [], tasks: [] }
		}),
		[effectiveStartDate, effectiveEndDate, currentFilters]
	);

	// Handle CSV export
	const handleCSVExport = useCallback(async () => {
		if (!hasData) {
			console.warn('No data available for export');
			return;
		}
		setCurrentExportType('csv');
		setShowProgressModal(true);
		// await exportToCSV(exportOptions);
	}, [hasData, exportOptions]);

	// Handle modal close
	const handleCloseModal = useCallback(() => {
		activeExportIdRef.current += 1;
		setShowProgressModal(false);
		resetProgress();
	}, [resetProgress]);

	// PDF Document Props (like weekly-limit approach)
	const PDFDocumentProps = useMemo(
		() => ({
			title: `Time & Activity Report - ${formattedStartDate} to ${formattedEndDate}`,
			startDate: formattedStartDate,
			endDate: formattedEndDate,
			appliedFilters: currentFilters
				? {
						teams: currentFilters.teams?.map((t) => t.name) || [],
						members: currentFilters.members?.map((m) => m.user?.name || m.fullName || 'Unknown') || [],
						projects: currentFilters.projects?.map((p) => p.name) || [],
						tasks: currentFilters.tasks?.map((t) => t.title) || []
					}
				: undefined,
			summary: exportSummary.hasData
				? {
						totalHours: '0h 0m',
						averageActivity: '0%',
						totalEarnings: '$0.00',
						totalRecords: exportSummary.totalRecords
					}
				: undefined
		}),
		[formattedStartDate, formattedEndDate, currentFilters, exportSummary]
	);

	// Rows shared by the PDF and XLSX exports (use the same logic that works in the hook)
	const transformedDataForPDF = useMemo(() => {
		const rows: ExportRow[] = [];

		exportableData.forEach((dayData) => {
			const date = dayData.date || '';

			// Handle the logs structure (which is what we actually have)
			if (hasLogsStructure(dayData)) {
				dayData.logs?.forEach((projectLog: ITimerProjectLog) => {
					const projectName = projectLog.project?.name || 'No Project';

					projectLog.employeeLogs?.forEach((employeeLog: ITimerEmployeeLog) => {
						const memberName =
							employeeLog.employee?.fullName || employeeLog.employee?.user?.name || 'Unknown Member';

						// If there are tasks, process them
						if (employeeLog.tasks && employeeLog.tasks.length > 0) {
							employeeLog.tasks.forEach((taskLog: ITimerTaskLog) => {
								const taskTitle = taskLog.task?.title || 'No Task';
								const duration = taskLog.duration || 0;
								const hours = Math.floor(duration / 3600);
								const minutes = Math.floor((duration % 3600) / 60);
								const trackedHours = `${hours}h ${minutes}m`;

								// Calculate earnings
								const hourlyRate = employeeLog.employee?.billRateValue || 0;
								const totalHours = duration / 3600;
								const earningsAmount = totalHours * hourlyRate;
								const earnings = `$${earningsAmount.toFixed(2)}`;

								// Activity level
								const activityPercent = employeeLog.activity || 0;
								const activityLevel = `${activityPercent}%`;

								rows.push({
									date,
									member: memberName,
									project: projectName,
									task: taskTitle,
									status: taskLog.task?.taskStatus?.name || taskLog.task?.status || '',
									trackedHours,
									earnings,
									activityLevel,
									durationSeconds: duration,
									earningsAmount,
									activityPercent
								});
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
							const earningsAmount = totalHours * hourlyRate;
							const earnings = `$${earningsAmount.toFixed(2)}`;

							// Activity level
							const activityPercent = employeeLog.activity || 0;
							const activityLevel = `${activityPercent}%`;

							rows.push({
								date,
								member: memberName,
								project: projectName,
								task: 'General Work',
								status: '',
								trackedHours,
								earnings,
								activityLevel,
								durationSeconds: duration,
								earningsAmount,
								activityPercent
							});
						}
					});
				});
			}
		});

		// Calculate totals from transformed data
		const totalSeconds = rows.reduce((acc, row) => {
			const hoursMatch = row.trackedHours?.match(/(\d+)h\s*(\d+)m/);
			if (hoursMatch) {
				const hours = parseInt(hoursMatch[1]) || 0;
				const minutes = parseInt(hoursMatch[2]) || 0;
				return acc + hours * 3600 + minutes * 60;
			}
			return acc;
		}, 0);

		const totalHours = Math.floor(totalSeconds / 3600);
		const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
		const formattedTotalHours = `${totalHours}h ${totalMinutes}m`;

		const totalEarnings = rows.reduce((acc, row) => {
			const earningsMatch = row.earnings?.match(/\$(\d+\.?\d*)/);
			return acc + (earningsMatch ? parseFloat(earningsMatch[1]) : 0);
		}, 0);

		const avgActivity =
			rows.length > 0
				? Math.round(
						rows.reduce((acc, row) => {
							const activityMatch = row.activityLevel?.match(/(\d+)%/);
							return acc + (activityMatch ? parseInt(activityMatch[1]) : 0);
						}, 0) / rows.length
					)
				: 0;

		return {
			rows,
			totals: {
				totalHours: formattedTotalHours,
				totalEarnings: `$${totalEarnings.toFixed(2)}`,
				avgActivity: `${avgActivity}%`
			}
		};
	}, [exportableData]);

	// Updated PDF Document Props with real totals
	const updatedPDFDocumentProps = useMemo(
		() => ({
			...PDFDocumentProps,
			summary: exportSummary.hasData
				? {
						totalHours: transformedDataForPDF.totals?.totalHours || '0h 0m',
						averageActivity: transformedDataForPDF.totals?.avgActivity || '0%',
						totalEarnings: transformedDataForPDF.totals?.totalEarnings || '$0.00',
						totalRecords: transformedDataForPDF.rows?.length || 0
					}
				: undefined
		}),
		[PDFDocumentProps, transformedDataForPDF, exportSummary.hasData]
	);

	// PDF Document (like weekly-limit approach)
	const pdfDocument = useMemo(() => {
		return groupByType === 'member' ? (
			<TimeActivityByMemberPDF data={transformedDataForPDF.rows} {...updatedPDFDocumentProps} />
		) : (
			<TimeActivityPDF data={transformedDataForPDF.rows} {...updatedPDFDocumentProps} />
		);
	}, [transformedDataForPDF, updatedPDFDocumentProps, groupByType]);

	// Generate filename for PDF
	const pdfFileName = useMemo(() => {
		return generateExportFilename('time-activity-report', 'pdf', effectiveStartDate, effectiveEndDate);
	}, [effectiveStartDate, effectiveEndDate]);

	// Handle XLSX export
	const handleXLSXExport = useCallback(async () => {
		if (!hasData) {
			console.warn('No data available for export');
			return;
		}
		const exportId = ++activeExportIdRef.current;
		setCurrentExportType('xlsx');
		setShowProgressModal(true);
		startExport(1);
		try {
			await exportToXLSX(
				transformedDataForPDF.rows,
				[
					{ header: t('common.DATE'), value: (row) => row.date, width: 12 },
					{ header: t('common.MEMBER'), value: (row) => row.member, width: 24 },
					{ header: t('pages.taskDetails.PROJECT'), value: (row) => row.project, width: 24 },
					{ header: t('common.TASK'), value: (row) => row.task, width: 40 },
					{ header: t('common.STATUS'), value: (row) => row.status, width: 16 },
					// Excel stores a duration as a fraction of a day
					{
						header: t('timeActivity.TRACKED_HOURS'),
						value: (row) => row.durationSeconds / 86400,
						format: '[h]:mm',
						width: 16
					},
					{
						header: t('timeActivity.EARNINGS'),
						value: (row) => row.earningsAmount,
						format: '[$$-409]#,##0.00',
						width: 14
					},
					{
						header: t('timeActivity.ACTIVITY_LEVEL'),
						value: (row) => row.activityPercent / 100,
						format: '0%',
						width: 16
					}
				],
				generateExportFilename('time-activity-report', 'xlsx', effectiveStartDate, effectiveEndDate)
			);
			if (exportId === activeExportIdRef.current) setSuccess();
		} catch (error) {
			logErrorInDev('XLSX export', error);
			if (exportId === activeExportIdRef.current) setError(t('timeActivity.EXPORT_FAILED'));
		}
	}, [hasData, startExport, transformedDataForPDF, t, effectiveStartDate, effectiveEndDate, setSuccess, setError]);

	// Handle retry export
	const handleRetryExport = useCallback(async () => {
		if (currentExportType === 'csv') {
			await handleCSVExport();
		} else if (currentExportType === 'xlsx') {
			await handleXLSXExport();
		}
	}, [currentExportType, handleCSVExport, handleXLSXExport]);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" className={buttonClassName} variant="outline">
						<span className="text-sm">{t('common.EXPORT')}</span>
						<ChevronDown size={15} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[100px]" align="center">
					{/* PDF Export */}
					<DropdownMenuItem className="cursor-pointer">
						<Suspense fallback={<ExportPDFSkeleton />}>
							<PDFDownloadLink
								className="w-full h-full pl-2 text-left"
								document={pdfDocument}
								fileName={pdfFileName}
								download={true}
							>
								{({ loading }) =>
									loading ? (
										<span className="w-full h-full">{t('common.LOADING')}...</span>
									) : (
										<span className="w-full h-full">PDF</span>
									)
								}
							</PDFDownloadLink>
						</Suspense>
					</DropdownMenuItem>

					{/* CSV Export */}
					<DropdownMenuItem disabled onClick={handleCSVExport} className="cursor-pointer">
						CSV
					</DropdownMenuItem>

					{/* XLSX Export */}
					<DropdownMenuItem disabled={!hasData} onClick={handleXLSXExport} className="cursor-pointer">
						XLSX
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Export Progress Modal */}
			<ExportProgressModal
				isOpen={showProgressModal}
				onClose={handleCloseModal}
				exportProgress={exportProgress}
				exportType={currentExportType}
				onRetry={handleRetryExport}
			/>
		</>
	);
}
