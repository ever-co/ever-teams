'use client';

import * as React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { ProductivityPDF } from '@/app/[locale]/dashboard/app-url/components/ProductivityPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { ProductivityApplicationPDF } from '@/app/[locale]/dashboard/app-url/components/productivity-application/Productivity-applicationPDF';

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
						<Button variant="outline" size="sm" disabled={loading}>
							{loading ? 'Loading PDF...' : 'Download PDF'}
						</Button>
					)}
				</PDFDownloadLink>
			)}
			{exportType === 'xlsx' && (
				<Button variant="outline" size="sm">
					Download XLSX
				</Button>
			)}
		</>
	);
};

export function ExportDialog({ isOpen, onClose, exportType, reportData, groupByType }: ExportDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="flex flex-col gap-y-4 items-center">
					<CheckCircle2 className="w-12 h-12 text-primary" />
					<DialogTitle className="text-xl text-center">Export Successful!</DialogTitle>
					<DialogDescription className="text-center">
						Your export is complete. Click below to download your file.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<ExportButtons reportData={reportData} exportType={exportType} groupByType={groupByType} />
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
