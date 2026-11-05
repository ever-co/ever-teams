'use client';
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
		<div className={clsxm('relative flex items-center w-fit max-w-full', className)}>
			<div className="flex w-full gap-x-1 overflow-x-auto no-scrollbar">
				{buttonData.map(({ label, count }, index) => {
					const isActive = activeStatus === label;
					return (
						<Button
							key={index}
							variant="ghost"
							size="sm"
							className={clsxm(
								'group shrink-0 justify-start gap-1.5 rounded-full px-3',
								'text-muted-foreground hover:text-foreground',
								isActive &&
									'bg-foreground text-background shadow-sm hairline-ring ring-foreground/5 hover:bg-foreground hover:text-background'
							)}
							onClick={() => onToggle(label)}
						>
							<span className="whitespace-nowrap">{label}</span>
							<span
								className={clsxm(
									'tabular-nums',
									isActive && 'text-background/70',
									!isActive && 'text-muted-foreground'
								)}
							>
								{count}
							</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
