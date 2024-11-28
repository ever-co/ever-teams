/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes } from 'react';
import { Button } from 'lib/components';
import { clsxm } from '@app/utils';
import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';

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
			'All Tasks': Object.values(data ?? {}).reduce((total, tasks) => total + (tasks?.length ?? 0), 0),
			Pending: data?.PENDING?.length ?? 0,
			Approved: data?.APPROVED?.length ?? 0,
			'In review': data?.['IN REVIEW']?.length ?? 0,
			Draft: data?.DRAFT?.length ?? 0,
			Rejected: data?.DENIED?.length ?? 0,
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
				'flex flex-nowrap h-[2.2rem] items-center bg-[#e2e8f0aa] dark:bg-gray-800 rounded-xl ',
				className
			)}
		>
			{buttonData.map(({ label, count, icon }, index) => (
				<Button
					key={index}
					className={clsxm(
						'group flex items-center justify-start h-[2.2rem] rounded-xl w-full',
						'dark:bg-gray-800 dark:border-primary-light bg-transparent text-[#71717A] w-[80px]',
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
