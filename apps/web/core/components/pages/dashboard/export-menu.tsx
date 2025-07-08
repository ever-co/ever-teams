'use client';

import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { useTranslations } from 'next-intl';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { Suspense } from 'react';
import { ExportPDFSkeleton } from '../../common/skeleton/export-pdf-skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';

/**
 * Props interface for the ExportMenu component
 */
interface ExportMenuProps {
	/** PDF document element to be rendered and exported */
	pdfDocument: React.ReactElement<DocumentProps>;
	/** Name of the file to be downloaded */
	fileName: string;
	/** Callback function for CSV export action */
	onCSVExport?: () => void;
	/** Whether the CSV export option is disabled */
	csvDisabled?: boolean;
	/** Custom className for the export button */
	buttonClassName?: string;
	/** Whether to show the export confirmation modal */
	showModal?: boolean;
	/** Start date for the report data */
	startDate: string;
	/** End date for the report data */
	endDate: string;
	/** Type of grouping applied to the report data */
	groupByType?: GroupByType;
	/** Array of report data to be exported */
	reportData?: any[];
	openModal?: () => void;
}

/**
 * ExportMenu component provides a dropdown menu for exporting data in different formats (PDF and CSV).
 * It uses the @react-pdf/renderer for PDF generation and supports custom styling and internationalization.
 *
 * @component
 * @example
 * ```tsx
 * <ExportMenu
 *   pdfDocument={<MyPDFDocument data={data} />}
 *   fileName="report.pdf"
 *   onCSVExport={() => handleCSVExport()}
 *   startDate="2025-03-01"
 *   endDate="2025-03-15"
 * />
 * ```
 */
export function ExportMenu({
	pdfDocument,
	fileName,
	onCSVExport,
	csvDisabled = true,
	buttonClassName = 'w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light py-1 h-9',
	showModal = true,
	openModal
}: ExportMenuProps) {
	const t = useTranslations();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" className={buttonClassName} variant="outline">
					<span className="text-sm">{t('common.EXPORT')}</span>
					<ChevronDown size={15} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[100px]" align="center">
				<DropdownMenuItem
					onClick={() => {
						if (!showModal && openModal) openModal();
					}}
					className="cursor-pointer"
				>
					{showModal && (
						<Suspense fallback={<ExportPDFSkeleton />}>
							<PDFDownloadLink
								className="w-full h-full text-left"
								document={pdfDocument}
								fileName={fileName}
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
					)}
					{!showModal && <span className="w-full h-full text-left">PDF</span>}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						if (!showModal && onCSVExport) onCSVExport();
					}}
					disabled={csvDisabled}
					className={`cursor-pointer ${csvDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
				>
					<span className="text-sm">CSV</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
