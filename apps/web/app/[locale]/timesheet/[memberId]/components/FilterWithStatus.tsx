/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes } from 'react';
import { Button } from 'lib/components';
import { clsxm } from '@app/utils';
import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { useTranslations } from 'next-intl';

export type FilterStatus = 'All Tasks' | 'Pending' | 'Approved' | 'In review' | 'Draft' | 'Rejected';
export function FilterWithStatus({
	activeStatus,
	onToggle,
	className,
	data
}: Readonly<{
	activeStatus: FilterStatus;
	data?: Record<TimesheetStatus, TimesheetLog[]>

	onToggle: (status: FilterStatus) => void;
	className?: HTMLAttributes<HTMLDivElement>;
}>) {
	const t = useTranslations();

	const statusIcons: Record<FilterStatus, string> = {
		'All Tasks': 'icon-all',
		Pending: 'icon-pending',
		Approved: 'icon-approved',
		'In review': 'icon-rejected',
		Draft: 'icon-approved',
		Rejected: 'icon-rejected',
	};

	const buttonData = React.useMemo(() => {
		const counts = {
			[t('pages.timesheet.ALL_TASKS')]: Object.values(data ?? {}).reduce((total, tasks) => total + (tasks?.length ?? 0), 0),
			[t('pages.timesheet.PENDING')]: data?.PENDING?.length ?? 0,
			[t('pages.timesheet.APPROVED')]: data?.APPROVED?.length ?? 0,
			[t('pages.timesheet.IN_REVIEW')]: data?.['IN REVIEW']?.length ?? 0,
			[t('pages.timesheet.DRAFT')]: data?.DRAFT?.length ?? 0,
			[t('pages.timesheet.REJECTED')]: data?.DENIED?.length ?? 0,
		};
		return Object.entries(counts).map(([label, count]) => ({
			label: label as FilterStatus,
			count,
			icon: <i className={statusIcons[label as FilterStatus]} />,
		}));
	}, [data]);


	return (
		<div
			className={clsxm(
				'flex flex-nowrap h-[36px] items-center bg-[#e2e8f0aa] dark:bg-gray-800 rounded-[8px] border-[1px] ',
				className
			)}>
			{buttonData.map(({ label, count, icon }, index) => (
				<Button
					key={index}
					className={clsxm(
						'group flex items-center justify-start h-[36px] rounded-[8px] w-[111px]',
						'dark:bg-gray-800 dark:border-primary-light bg-transparent text-[#71717A]',
						activeStatus === label &&
						'text-primary bg-white shadow-2xl dark:text-primary-light font-bold  border'
					)}
					onClick={() => onToggle(label)}
				>
					<span
						className={clsxm(
							'font-medium ml-1 text-gray-500 dark:text-gray-200',
							activeStatus === label && 'text-primary font-bold dark:text-primary-light'
						)}
					>
						{label}
					</span>
					<span className="ml-1 font-medium text-gray-500 dark:text-gray-400">{count}</span>
				</Button>
			))}
		</div>
	);
}
