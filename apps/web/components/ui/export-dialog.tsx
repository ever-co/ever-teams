'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductivityPDF } from '@/app/[locale]/dashboard/app-url/components/ProductivityPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { ProductivityApplicationPDF } from '@/app/[locale]/dashboard/app-url/components/productivity-application/Productivity-applicationPDF';
import { Modal } from '@/lib/components';

interface ExportDialogProps {
	isOpen: boolean;
	onClose?: () => void;
	exportType?: 'export' | 'pdf' | 'xlsx';
	reportData?: any[] | undefined;
	groupByType?: GroupByType;
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
	reportData,
	exportType,
	groupByType
}: Pick<ExportDialogProps, 'reportData' | 'exportType' | 'groupByType'>) => {
	if (!reportData) return null;

	return (
		<>
			{exportType === 'pdf' && (
				<PDFDownloadLink
					document={
						groupByType === 'application' ? (
              <ProductivityPDF data={reportData} title={getReportTitle(groupByType)} />
						) : (
							<ProductivityApplicationPDF data={reportData} title={getReportTitle(groupByType)} />
						)
					}
					fileName={`productivity-report-${groupByType}.pdf`}
				>
					{({ loading }) => (
						<Button className='bg-light--theme-light dark:bg-dark-high' variant="outline" size="sm" disabled={loading}>
							{loading ? 'Loading PDF...' : 'Download PDF'}
						</Button>
					)}
				</PDFDownloadLink>
			)}
			{exportType === 'xlsx' && (
				<Button className='bg-light--theme-light dark:bg-dark-high' variant="outline" size="sm">
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
		<div className="flex flex-col gap-y-4 items-center">
			<CheckCircle2 className="w-12 h-12 text-primary" />
			<p className="text-center text-muted-foreground">
				Your export is complete. Click below to download your file.
			</p>
			<div className="flex flex-col gap-3 sm:flex-row sm:gap-2 w-full justify-end">
			<Button variant="outline" onClick={onClose} className='bg-light--theme-light dark:bg-dark-high'>
				Cancel
			</Button>
			<ExportButtons reportData={reportData} exportType={exportType} groupByType={groupByType} />
		</div>
		</div>
	</Modal>
	);
}
