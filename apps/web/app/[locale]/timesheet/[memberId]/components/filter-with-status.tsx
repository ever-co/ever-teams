/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes } from 'react';
import { Button } from '@/core/components';
import { clsxm } from '@/core/lib/utils';
import { TimesheetLog, TimesheetStatus } from '@/core/types/interfaces';
import { useTranslations } from 'next-intl';

export type FilterStatus = 'All Tasks' | 'Pending' | 'Approved' | 'In review' | 'Draft' | 'Rejected';
export function FilterWithStatus({
	activeStatus,
	onToggle,
	className,
	data
}: Readonly<{
	activeStatus: FilterStatus;
	data?: Record<TimesheetStatus, TimesheetLog[]>;

	onToggle: (status: FilterStatus) => void;
	className?: HTMLAttributes<HTMLDivElement>;
}>) {
	const t = useTranslations();

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const statusIcons: Record<FilterStatus, string> = {
		'All Tasks': 'icon-all',
		Pending: 'icon-pending',
		Approved: 'icon-approved',
		'In review': 'icon-rejected',
		Draft: 'icon-approved',
		Rejected: 'icon-rejected'
	};

	const buttonData = React.useMemo(() => {
		const counts = {
			[t('pages.timesheet.ALL_TASKS')]: Object.values(data ?? {}).reduce(
				(total, tasks) => total + (tasks?.length ?? 0),
				0
			),
			[t('pages.timesheet.PENDING')]: data?.PENDING?.length ?? 0,
			[t('pages.timesheet.APPROVED')]: data?.APPROVED?.length ?? 0,
			[t('pages.timesheet.IN_REVIEW')]: data?.['IN REVIEW']?.length ?? 0,
			[t('pages.timesheet.DRAFT')]: data?.DRAFT?.length ?? 0,
			[t('pages.timesheet.REJECTED')]: data?.DENIED?.length ?? 0
		};
		return Object.entries(counts).map(([label, count]) => ({
			label: label as FilterStatus,
			count,
			icon: <i className={statusIcons[label as FilterStatus]} />
		}));
	}, [data]);

	return (
		<div
			className={clsxm(
				'relative flex h-[36px] items-center bg-[#e2e8f0aa] dark:bg-gray-800 rounded-[8px] border-[1px] overflow-hidden',
				'w-full max-w-full',
				className
			)}
		>
			<div className="flex overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
				{buttonData.map(({ label, count, icon }, index) => (
					<Button
						key={index}
						className={clsxm(
							'group flex items-center justify-start h-[36px] rounded-[8px] shrink-0',
							'min-w-[90px] sm:min-w-[100px] md:min-w-[111px]',
							'px-2 sm:px-3',
							'dark:bg-gray-800 dark:border-primary-light bg-transparent text-[#71717A]',
							'transition-colors duration-200 ease-in-out',
							'hover:bg-gray-50 dark:hover:bg-gray-700',
							activeStatus === label &&
								'text-primary bg-white shadow-2xl dark:text-primary-light font-bold border'
						)}
						onClick={() => onToggle(label)}
					>
						<span
							className={clsxm(
								'font-medium text-xs sm:text-sm text-gray-500 dark:text-gray-200 whitespace-nowrap',
								activeStatus === label && 'text-primary font-bold dark:text-primary-light'
							)}
						>
							{label}
						</span>
						<span className="ml-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
							{count}
						</span>
					</Button>
				))}
			</div>
		</div>
	);
}
