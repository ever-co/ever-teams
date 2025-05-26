import { TimesheetStatus } from '@/core/types/enums/timesheet';
import { clsxm } from '@/core/lib/utils';
import { TranslationHooks } from 'next-intl';
import { ReactNode } from 'react';
import { ApproveSelectedIcon, DeleteSelectedIcon, RejectSelectedIcon } from './timesheet-icons';
import { TimeFrequency } from '@/core/types/enums/date';
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

// eslint-disable-next-line @typescript-eslint/no-empty-function
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
			className="hover:underline text-sm gap-2"
			disabled={disabled}
			key={index}
			icon={button.icon}
			onClick={() => onClick(button.action)}
			title={button.title}
		/>
	));
};

export const statusTable: { label: TimesheetStatus; description: string }[] = [
	{ label: TimesheetStatus.PENDING, description: 'Awaiting approval or review' },
	{ label: TimesheetStatus.IN_REVIEW, description: 'The item is being reviewed' },
	{ label: TimesheetStatus.APPROVED, description: 'The item has been approved' },
	{ label: TimesheetStatus.DRAFT, description: 'The item is saved as draft' },
	{ label: TimesheetStatus.DENIED, description: 'The item has been rejected' }
];

export const DailyTable: { label: TimeFrequency; description: string }[] = [
	{ label: TimeFrequency.DAILY, description: 'Group by Daily' },
	{ label: TimeFrequency.WEEKLY, description: 'Group by Weekly' },
	{ label: TimeFrequency.MONTHLY, description: 'Group by Monthly' }
];
