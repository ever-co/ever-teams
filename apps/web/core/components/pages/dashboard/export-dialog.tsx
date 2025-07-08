'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/core/components/duplicated-components/_button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';

import { Modal } from '@/core/components';
import { ProductivityApplicationPDF } from '@/core/components/pages/dashboard/app-url/productivity-application/productivity-application-pdf';
import { ProductivityPDF } from '@/core/components/pages/dashboard/app-url/productivity-pdf';

interface ExportDialogProps {
	isOpen: boolean;
	onClose?: () => void;
	exportType?: 'export' | 'pdf' | 'xlsx';
	reportData?: any[] | undefined;
	groupByType?: GroupByType;
	startDate?: string;
	endDate?: string;
}

const getReportTitle = (groupByType: GroupByType = 'daily') => {
	const reportTitles: Record<GroupByType, string> = {
		daily: 'Daily Productivity Report',
		weekly: 'Weekly Productivity Report',
		member: 'Member Productivity Report',
		date: 'Date Productivity Report',
		project: 'Project Productivity Report',
		employee: 'Employee Productivity Report',
		application: 'Application Productivity Report'
	};
	return reportTitles[groupByType] || 'Productivity Report';
};

const ExportButtons = ({
	reportData = [],
	exportType,
	groupByType = 'daily',
	endDate = '',
	startDate = ''
}: Pick<ExportDialogProps, 'reportData' | 'exportType' | 'groupByType' | 'endDate' | 'startDate'>) => {
	// Debug info (development only)
	if (process.env.NODE_ENV === 'development') {
		console.log('ExportButtons Debug:', {
			reportData: reportData?.length,
			exportType,
			groupByType,
			startDate,
			endDate
		});
	}

	// Data validation - allow export even with empty data
	const hasData = Array.isArray(reportData) && reportData.length > 0;
	const canExport = Array.isArray(reportData); // Can export if it's an array (even empty)

	// If no valid data format, show informative button
	if (!canExport) {
		return (
			<Button
				className="cursor-pointer bg-light--theme-light dark:bg-dark-high"
				variant="outline"
				size="sm"
				disabled
			>
				Invalid Data Format
			</Button>
		);
	}

	return (
		<>
			{exportType === 'pdf' && (
				<PDFDownloadLink
					document={
						groupByType === 'date' ? (
							<ProductivityPDF
								data={hasData ? reportData : []} // Use empty array if no data
								title={`Activity Report for ${startDate} - ${endDate}`}
								startDate={startDate}
								endDate={endDate}
							/>
						) : (
							<ProductivityApplicationPDF
								data={hasData ? reportData : []} // Use empty array if no data
								title={getReportTitle(groupByType)}
							/>
						)
					}
					fileName={`productivity-report-${startDate}-to-${endDate}.pdf`}
					download={true}
				>
					{({ loading, error }) => (
						<Button
							className="cursor-pointer bg-light--theme-light dark:bg-dark-high"
							variant="outline"
							size="sm"
							disabled={loading || !!error}
						>
							{loading
								? 'Generating PDF...'
								: error
									? 'PDF Error'
									: hasData
										? 'Download PDF'
										: 'Download PDF (No Data)'}
						</Button>
					)}
				</PDFDownloadLink>
			)}
			{exportType === 'xlsx' && (
				<Button
					className="cursor-pointer bg-light--theme-light dark:bg-dark-high"
					variant="outline"
					size="sm"
					onClick={() => {
						// TODO: Implement XLSX export
						console.log('XLSX export not implemented yet');
					}}
				>
					{hasData ? 'Download XLSX' : 'Download XLSX (No Data)'}
				</Button>
			)}
		</>
	);
};

export function ExportDialog({
	isOpen,
	onClose,
	exportType,
	reportData,
	groupByType,
	startDate,
	endDate
}: ExportDialogProps) {
	return (
		<Modal
			closeModal={onClose || (() => {})}
			showCloseIcon={false}
			className="sm:max-w-md bg-light--theme-light dark:bg-dark-high py-4 rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start !h-[auto]"
			titleClass="flex flex-col gap-y-4 items-center text-xl text-center"
			title="Export Successful!"
			isOpen={isOpen}
		>
			<div className="flex flex-col gap-y-4 items-center">
				<CheckCircle2 className="w-12 h-12 text-primary" />
				<p className="text-center text-muted-foreground">
					Your export is complete. Click below to download your file.
				</p>
				<div className="flex flex-col gap-3 justify-end w-full sm:flex-row sm:gap-2">
					<Button variant="outline" onClick={onClose} className="bg-light--theme-light dark:bg-dark-high">
						Cancel
					</Button>
					<ExportButtons
						reportData={reportData}
						exportType={exportType}
						groupByType={groupByType}
						startDate={startDate}
						endDate={endDate}
					/>
				</div>
			</div>
		</Modal>
	);
}
