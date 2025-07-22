'use client';

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useTranslations } from 'next-intl';
import { useTimeActivityExport } from '@/core/hooks/activities/use-time-activity-export';
import { FilterState } from '@/core/types/interfaces/timesheet/time-limit-report';
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

export interface TimeActivityExportMenuProps {
	rapportDailyActivity?: any[];
	isManage?: boolean;
	currentFilters?: FilterState;
	startDate?: Date;
	endDate?: Date;
	groupByType?: GroupByType;
	buttonClassName?: string;
}

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

	const { exportableData, resetProgress, exportSummary, exportProgress } = useTimeActivityExport({
		rapportDailyActivity,
		isManage,
		currentFilters,
		startDate,
		endDate
	});

	// Check if we have data to export
	const hasData = exportableData && exportableData.length > 0;

	// Format dates for display
	const formatDate = useCallback((date: Date | undefined): string => {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}, []);

	const formattedStartDate = formatDate(startDate);
	const formattedEndDate = formatDate(endDate);

	// Prepare export options
	const exportOptions = useMemo(
		() => ({
			format: 'csv' as const,
			includeFilters: true,
			dateRange: {
				startDate: startDate || new Date(),
				endDate: endDate || new Date()
			},
			appliedFilters: currentFilters || { teams: [], members: [], projects: [], tasks: [] }
		}),
		[startDate, endDate, currentFilters]
	);

	// Handle CSV export
	const handleCSVExport = useCallback(async () => {
		if (!hasData) {
			console.warn('No data available for export');
			// TODO: Show toast notification
			return;
		}
		setCurrentExportType('csv');
		setShowProgressModal(true);
		// await exportToCSV(exportOptions);
	}, [hasData, exportOptions]);

	// Handle XLSX export
	const handleXLSXExport = useCallback(async () => {
		if (!hasData) {
			console.warn('No data available for export');
			// TODO: Show toast notification
			return;
		}
		setCurrentExportType('xlsx');
		setShowProgressModal(true);
		// await exportToXLSX({ ...exportOptions, format: 'xlsx' });
	}, [hasData, exportOptions]);

	// Handle modal close
	const handleCloseModal = useCallback(() => {
		setShowProgressModal(false);
		resetProgress();
	}, [resetProgress]);

	// Handle retry export
	const handleRetryExport = useCallback(async () => {
		if (currentExportType === 'csv') {
			await handleCSVExport();
		} else if (currentExportType === 'xlsx') {
			await handleXLSXExport();
		}
	}, [currentExportType, handleCSVExport, handleXLSXExport]);

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

	// Transform data for PDF (use the same logic that works in the hook)
	const transformedDataForPDF = useMemo(() => {
		const rows: any[] = [];

		exportableData.forEach((dayData) => {
			const date = dayData.date || '';

			// Handle the logs structure (which is what we actually have)
			if (dayData.logs) {
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

								rows.push({
									date,
									member: memberName,
									project: projectName,
									task: taskTitle,
									trackedHours,
									earnings,
									activityLevel
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
							const earnings = `$${(totalHours * hourlyRate).toFixed(2)}`;

							// Activity level
							const activityLevel = `${employeeLog.activity || 0}%`;

							rows.push({
								date,
								member: memberName,
								project: projectName,
								task: 'General Work',
								trackedHours,
								earnings,
								activityLevel
							});
						}
					});
				});
			}
		});
		return rows;
	}, [exportableData]);

	// PDF Document (like weekly-limit approach)
	const pdfDocument = useMemo(() => {
		return groupByType === 'member' ? (
			<TimeActivityByMemberPDF data={transformedDataForPDF} {...PDFDocumentProps} />
		) : (
			<TimeActivityPDF data={transformedDataForPDF} {...PDFDocumentProps} />
		);
	}, [transformedDataForPDF, PDFDocumentProps, groupByType, exportableData]);

	// Generate filename for PDF
	const pdfFileName = useMemo(() => {
		const dateStr =
			startDate && endDate
				? `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`
				: new Date().toISOString().split('T')[0];
		return `time-activity-report-${dateStr}.pdf`;
	}, [startDate, endDate]);

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
								className="w-full h-full text-left"
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
					<DropdownMenuItem onClick={handleCSVExport} className="cursor-pointer">
						CSV
					</DropdownMenuItem>

					{/* XLSX Export */}
					<DropdownMenuItem onClick={handleXLSXExport} className="cursor-pointer">
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
