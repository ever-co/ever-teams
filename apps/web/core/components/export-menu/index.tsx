'use client';

import { Menu, Transition } from '@headlessui/react';
import { Button } from '@/core/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { useTranslations } from 'next-intl';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';

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
	buttonClassName = 'w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light',
	showModal = true,
	openModal
}: ExportMenuProps) {
	const t = useTranslations();
	return (
		<Menu as="div" className="relative inline-block text-left">
			<Menu.Button className="w-full h-full items-center justify-between">
				<Button type="button" className={buttonClassName} variant="outline">
					<span className="text-sm">{t('common.EXPORT')}</span> <ChevronDown size={15} />
				</Button>
			</Menu.Button>
			<Transition
				as="div"
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items
					static
					className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-[100px] origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark--theme-light shadow-lg ring-1 ring-black/5 focus:outline-none"
				>
					<div className="p-1 flex flex-col">
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										if (!showModal && openModal) openModal();
									}}
									className={`${active && 'bg-primary/10'} data-[state=checked]:text-blue-600 group flex w-full items-center px-2 py-2 text-sm`}
								>
									{showModal && (
										<PDFDownloadLink
											className="w-full h-full text-left"
											document={pdfDocument}
											fileName={fileName}
											download={true}
										>
											{({ loading }) =>
												loading ? (
													<p className="w-full h-full">{t('common.LOADING')}...</p>
												) : (
													<p className="w-full h-full">PDF</p>
												)
											}
										</PDFDownloadLink>
									)}
									{!showModal && <p className="w-full h-full text-left">PDF</p>}
								</button>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => {
										if (!showModal && onCSVExport) onCSVExport();
									}}
									disabled={csvDisabled}
									className={`${active && 'bg-primary/10'} data-[state=checked]:text-blue-600 group flex w-full items-center px-2 py-2 text-sm ${csvDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
								>
									<span className="text-sm">CSV</span>
								</button>
							)}
						</Menu.Item>
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
