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
	groupByType,
	endDate,
	startDate
}: Pick<ExportDialogProps, 'reportData' | 'exportType' | 'groupByType' | 'endDate' | 'startDate'>) => {
	if (!reportData) return null;

	return (
		<>
			{exportType === 'pdf' && (
				<PDFDownloadLink
					document={
						groupByType === 'date' ? (
							<ProductivityPDF
								data={reportData}
								title={`Activity Report for ${startDate} - ${endDate}`}
								startDate={startDate}
								endDate={endDate}
							/>
						) : (
							<ProductivityApplicationPDF data={reportData} title={getReportTitle(groupByType)} />
						)
					}
					fileName={`productivity-report from ${startDate}-${endDate}.pdf`}
				>
					{({ loading }) => (
						<Button
							className="cursor-pointer bg-light--theme-light dark:bg-dark-high"
							variant="outline"
							size="sm"
							disabled={loading}
						>
							{loading ? 'Loading PDF...' : 'Download PDF'}
						</Button>
					)}
				</PDFDownloadLink>
			)}
			{exportType === 'xlsx' && (
				<Button className="cursor-pointer bg-light--theme-light dark:bg-dark-high" variant="outline" size="sm">
					Download XLSX
				</Button>
			)}
		</>
	);
};

export function ExportDialog({ isOpen, onClose, exportType, reportData, groupByType }: ExportDialogProps) {
	return (
		<Modal
			closeModal={() => onClose}
			showCloseIcon={false}
			className="sm:max-w-md bg-light--theme-light dark:bg-dark-high py-4 rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start !h-[auto]"
			titleClass="flex flex-col gap-y-4 items-center text-xl text-center"
			title="Export Successful!"
			isOpen={isOpen}
		>
			<div className="flex flex-col items-center gap-y-4">
				<CheckCircle2 className="w-12 h-12 text-primary" />
				<p className="text-center text-muted-foreground">
					Your export is complete. Click below to download your file.
				</p>
				<div className="flex flex-col justify-end w-full gap-3 sm:flex-row sm:gap-2">
					<Button variant="outline" onClick={onClose} className="bg-light--theme-light dark:bg-dark-high">
						Cancel
					</Button>
					<ExportButtons reportData={reportData} exportType={exportType} groupByType={groupByType} />
				</div>
			</div>
		</Modal>
	);
}
