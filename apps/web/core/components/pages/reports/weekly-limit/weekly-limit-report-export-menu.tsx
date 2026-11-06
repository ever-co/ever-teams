import { Button } from '@/core/components';
import { Menu, Transition } from '@headlessui/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ChevronDown } from '@/core/components/icons';
import { clsxm } from '@/core/lib/utils';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { WeeklyLimitPDFDocument } from './export-formats/pdf';
import { WeeklyLimitByEmployeePDFDocument } from './export-formats/pdf/grouped-by-employee';
import { TOrganizationTeam, TTimeLimitReportByEmployee } from '@/core/types/schemas';
import { TTimeLimitReportList } from '@/core/types/schemas';

interface IProps {
	data: TTimeLimitReportList[];
	dataByEmployee: TTimeLimitReportByEmployee[];
	activeTeam: TOrganizationTeam | null;
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
			<Menu.Button as={Button} type="button" className="min-w-fit" variant="outline" size="default">
				<span>{t('common.EXPORT')}</span> <ChevronDown className="text-muted-foreground" />
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
					className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-40 origin-top rounded-xl bg-popover text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none"
				>
					<div className="flex flex-col gap-0.5 p-1">
						<Menu.Item>
							{({ active }) => (
								<button
									className={clsxm(
										'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm disabled:opacity-50',
										active && 'bg-foreground/5'
									)}
								>
									<PDFDownloadLink
										className="w-full h-full pl-2 text-left"
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
									className={clsxm(
										'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm disabled:opacity-50',
										active && 'bg-foreground/5'
									)}
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
