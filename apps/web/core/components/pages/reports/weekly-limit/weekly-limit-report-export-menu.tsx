import { Button } from '@/core/components';
import { Menu, Transition } from '@headlessui/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IOrganizationTeam } from '@/core/types/interfaces/to-review';
import { ITimeLimitReport, ITimeLimitReportByEmployee } from '@/core/types/interfaces/timesheet/ITimeLimitsReport';
import { WeeklyLimitPDFDocument } from './export-formats/pdf';
import { WeeklyLimitByEmployeePDFDocument } from './export-formats/pdf/grouped-by-employee';

interface IProps {
	data: ITimeLimitReport[];
	dataByEmployee: ITimeLimitReportByEmployee[];
	activeTeam: IOrganizationTeam | null;
	displayMode: 'week' | 'date';
	organizationLimits: {
		date: number;
		week: number;
	};
	isGroupedByEmployee: boolean;
}

export function WeeklyLimitExportMenu(props: IProps) {
	const { data, activeTeam, displayMode, organizationLimits, dataByEmployee, isGroupedByEmployee } = props;

	const t = useTranslations();

	const PDFDocumentProps = useMemo(
		() => ({
			headers: {
				indexValue: t('common.MEMBER'),
				limit: t('pages.timeLimitReport.LIMIT'),
				remaining: t('pages.timeLimitReport.REMAINING'),
				timeSpent: t('pages.timeLimitReport.TIME_SPENT'),
				percentageUsed: t('pages.timeLimitReport.PERCENTAGE_USED')
			},
			title: `Weekly Limit Report - ${activeTeam?.name}`,
			organizationLimits,
			displayMode
		}),
		[activeTeam?.name, displayMode, organizationLimits, t]
	);

	const pdfDocument = useMemo(
		() =>
			isGroupedByEmployee ? (
				<WeeklyLimitByEmployeePDFDocument data={dataByEmployee} {...PDFDocumentProps} />
			) : (
				<WeeklyLimitPDFDocument data={data} {...PDFDocumentProps} />
			),
		[isGroupedByEmployee, dataByEmployee, PDFDocumentProps, data]
	);

	return (
		<Menu as="div" className="relative inline-block text-left">
			<Menu.Button className="items-center justify-between w-full h-full ">
				<Button
					type="button"
					className=" border-gray-200 text-sm hover:bg-slate-100 min-w-fit text-black  h-[2.2rem] font-light hover:dark:bg-transparent"
					variant="outline"
				>
					<span>{t('common.EXPORT')}</span> <ChevronDown size={15} />
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
					className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none"
				>
					<div className="flex flex-col gap-1 p-1">
						<Menu.Item>
							{({ active }) => (
								<button
									className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
								>
									<PDFDownloadLink
										className="w-full h-full text-left"
										document={pdfDocument}
										fileName={`${activeTeam?.name}-weekly-limit-report.pdf`}
									>
										{({ loading }) =>
											loading ? (
												<p className="w-full h-full">{t('common.LOADING')}...</p>
											) : (
												<p className="w-full h-full">PDF</p>
											)
										}
									</PDFDownloadLink>
								</button>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<button
									disabled // Will be implemented later
									className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
								>
									<span>CSV</span>
								</button>
							)}
						</Menu.Item>
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
