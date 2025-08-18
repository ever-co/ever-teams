import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { clsxm } from '@/core/lib/utils';
import { TranslationHooks } from 'next-intl';
import { ReactNode } from 'react';
import { ApproveSelectedIcon, DeleteSelectedIcon, RejectSelectedIcon } from './timesheet-icons';
import { ETimeFrequency } from '@/core/types/generics/enums/date';
type ITimesheetButton = {
	title?: string;
	onClick?: () => void;
	className?: string;
	icon?: ReactNode;
	disabled?: boolean;
};
export const TimesheetButton = ({ className, icon, onClick, title, disabled }: ITimesheetButton) => {
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!disabled && onClick) {
			onClick();
		}
	};
	return (
		<button
			disabled={disabled}
			onClick={handleClick}
			className={clsxm('flex items-center gap-1 text-gray-400 font-normal leading-3', className)}
		>
			<div className="w-[16px] h-[16px] text-[#293241]">{icon}</div>
			<span>{title}</span>
		</button>
	);
};

export type StatusType = 'PENDING' | 'APPROVED' | 'Denied';
export type StatusAction = 'Deleted' | 'Approved' | 'Denied';

export const getTimesheetButtons = (
	status: StatusType,
	t: TranslationHooks,
	disabled: boolean,
	onClick: (action: StatusAction) => void
) => {
	const buttonsConfig: Record<StatusType, { icon: ReactNode; title: string; action: StatusAction }[]> = {
		PENDING: [
			{
				icon: <ApproveSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'),
				action: 'Approved'
			},
			{
				icon: <RejectSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'),
				action: 'Denied'
			},
			{
				icon: <DeleteSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'),
				action: 'Deleted'
			}
		],
		APPROVED: [
			{
				icon: <RejectSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED'),
				action: 'Denied'
			},
			{
				icon: <DeleteSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'),
				action: 'Deleted'
			}
		],
		Denied: [
			{
				icon: <ApproveSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED'),
				action: 'Approved'
			},
			{
				icon: <DeleteSelectedIcon className="dark:!text-gray-400 rounded" />,
				title: t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED'),
				action: 'Deleted'
			}
		]
	};

	return (buttonsConfig[status] || buttonsConfig.Denied).map((button, index) => (
		<TimesheetButton
			className="gap-2 text-sm hover:underline"
			disabled={disabled}
			key={index}
			icon={button.icon}
			onClick={() => onClick(button.action)}
			title={button.title}
		/>
	));
};

export const statusTable: { label: ETimesheetStatus; description: string }[] = [
	{ label: ETimesheetStatus.PENDING, description: 'Awaiting approval or review' },
	{ label: ETimesheetStatus.IN_REVIEW, description: 'The item is being reviewed' },
	{ label: ETimesheetStatus.APPROVED, description: 'The item has been approved' },
	{ label: ETimesheetStatus.DRAFT, description: 'The item is saved as draft' },
	{ label: ETimesheetStatus.DENIED, description: 'The item has been rejected' }
];

export const DailyTable: { label: ETimeFrequency; description: string }[] = [
	{ label: ETimeFrequency.DAILY, description: 'Group by Daily' },
	{ label: ETimeFrequency.WEEKLY, description: 'Group by Weekly' },
	{ label: ETimeFrequency.MONTHLY, description: 'Group by Monthly' }
];
