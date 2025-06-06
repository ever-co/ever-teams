/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes } from 'react';
import { Button } from '@/core/components';
import { clsxm } from '@/core/lib/utils';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { useTranslations } from 'next-intl';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

export type FilterStatus = 'All Tasks' | 'Pending' | 'Approved' | 'In review' | 'Draft' | 'Rejected';
export function FilterWithStatus({
	activeStatus,
	onToggle,
	className,
	data
}: Readonly<{
	activeStatus: FilterStatus;
	data?: Record<ETimesheetStatus, ITimeLog[]>;

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
				'w-fit max-w-full',
				className
			)}
		>
			<div className="flex w-full gap-x-0.5 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
				{buttonData.map(({ label, count, icon }, index) => (
					<Button
						key={index}
						className={clsxm(
							'group flex gap-1 items-center justify-start h-[36px] rounded-[8px] shrink-0',
							'min-w-20 sm:min-w-fit',
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
						<span className="text-xs font-medium text-gray-500 sm:text-sm dark:text-gray-400">{count}</span>
					</Button>
				))}
			</div>
		</div>
	);
}
