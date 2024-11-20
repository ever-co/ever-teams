/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes } from 'react';
import { Button } from 'lib/components';
import { clsxm } from '@app/utils';

export type FilterStatus = 'All Tasks' | 'Pending' | 'Approved' | 'Rejected';
export function FilterWithStatus({
	activeStatus,
	onToggle,
	className
}: Readonly<{
	activeStatus: FilterStatus;
	onToggle: (status: FilterStatus) => void;
	className?: HTMLAttributes<HTMLDivElement>;
}>) {
	const buttonData: { label: FilterStatus; count: number; icon: React.ReactNode }[] = [
		{ label: 'All Tasks', count: 46, icon: <i className="icon-all" /> },
		{ label: 'Pending', count: 12, icon: <i className="icon-pending" /> },
		{ label: 'Approved', count: 28, icon: <i className="icon-approved" /> },
		{ label: 'Rejected', count: 6, icon: <i className="icon-rejected" /> }
	];

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
