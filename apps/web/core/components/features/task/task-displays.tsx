import { ITeamTask, Nullable, TimesheetLog } from '@/core/types/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from '@/core/components';
import { TaskIssueStatus } from './task-issue';
import { differenceBetweenHours, formatDate, secondsToTime } from '@/app/helpers';
import { ClockIcon } from '@radix-ui/react-icons';
import React from 'react';
import { CalendarArrowDown, UserPlusIcon } from 'lucide-react';
import { cn } from '@/core/lib/helpers';

type Props = {
	task: Nullable<ITeamTask>;
	className?: string;
	taskTitleClassName?: string;
	taskNumberClassName?: string;
	taskIssueStatusClassName?: string;
	dash?: boolean;
	showSize?: boolean;
};

const taskSizeColor = {
	'x-large': { color: 'text-red-700', short: 'XXL' },
	large: { color: 'text-orange-700', short: 'XL' },
	medium: { color: 'text-yellow-500', short: 'M' },
	small: { color: 'text-blue-700', short: 'S' },
	tiny: { color: 'text-blue-500', short: 'XS' }
};

export function TaskNameInfoDisplay({
	task,
	className,
	taskTitleClassName,
	taskNumberClassName,
	taskIssueStatusClassName,
	dash = false,
	showSize = false
}: Props) {
	const size =
		task && task?.size && ['x-large', 'large', 'medium', 'small', 'tiny'].includes(task?.size.toLowerCase())
			? task?.size.toLowerCase()
			: 'medium';

	// @ts-expect-error
	const color: string = taskSizeColor[size].color;
	// @ts-expect-error
	const short: string = taskSizeColor[size].short;
	return (
		<Tooltip
			label={task?.title || ''}
			placement="top"
			className={clsxm(className)}
			enabled={(task?.title && task?.title.length > 60) || false}
		>
			<span className=" w-full h-full gap-1 flex items-center">
				{task && (
					// Show task issue and task number
					<div className="">
						<TaskIssueStatus
							showIssueLabels={false}
							className={clsxm(taskIssueStatusClassName)}
							task={task}
						/>
					</div>
				)}
				<span className={clsxm('font-normal grow truncate', taskTitleClassName)}>
					<span className={clsxm('font-normal text-gray-500', taskNumberClassName)}>
						#{task?.taskNumber} {dash && '-'}
					</span>
					{task?.title}
					{showSize && <span className={clsxm(size && `${color}`)}>{size && '  ' + short}</span>}
				</span>
			</span>
		</Tooltip>
	);
}

const formatTime = (hours: number, minutes: number, second?: number) => (
	<div className="flex justify-start items-start min-w-[4rem]">
		<span>{String(hours).padStart(2, '0')}</span>
		<span>:</span>
		<span>{String(minutes).padStart(2, '0')}</span>
		{second !== undefined && (
			<>
				<span>:</span>
				<span>{String(second).padStart(2, '0')}</span>
			</>
		)}
		<span>h</span>
	</div>
);

export const DisplayTimeForTimesheet = ({
	timesheetLog,
	logType
}: {
	timesheetLog: TimesheetLog;
	logType?: 'TRACKED' | 'MANUAL' | 'IDLE' | undefined;
}) => {
	const seconds = differenceBetweenHours(
		timesheetLog.startedAt instanceof Date ? timesheetLog.startedAt : new Date(timesheetLog.startedAt),
		timesheetLog.stoppedAt instanceof Date ? timesheetLog.stoppedAt : new Date(timesheetLog.stoppedAt)
	);

	const { h: hours, m: minute } = secondsToTime(seconds);

	const iconClasses = 'text-[14px] h-4 w-4';
	const icons = {
		MANUAL: <UserPlusIcon className={`text-red-500 ${iconClasses}`} />,
		TRACKED: <ClockIcon className={`text-green-400 ${iconClasses}`} />,
		IDLE: <CalendarArrowDown className={`text-yellow-400 ${iconClasses}`} />
	};
	const resolvedLogType: keyof typeof icons = logType ?? 'TRACKED';
	return (
		<div className="flex gap-x-1 justify-start items-start font-medium">
			{icons[resolvedLogType]}
			<div className="flex items-start justify-start text-[#282048] dark:text-[#9b8ae1]">
				{formatTime(hours, minute)}
			</div>
		</div>
	);
};

export const TotalTimeDisplay = React.memo(
	({ timesheetLog, className }: { timesheetLog: TimesheetLog[]; className?: string }) => {
		const totalDuration = Array.isArray(timesheetLog)
			? timesheetLog.reduce((acc, item) => {
					const seconds = differenceBetweenHours(
						item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
						item.stoppedAt instanceof Date ? item.stoppedAt : new Date(item.stoppedAt)
					);
					return acc + seconds;
				}, 0)
			: 0;

		const { h: hours, m: minute } = secondsToTime(totalDuration || 0);
		return <div className={cn('flex items-center text-[#868688]', className)}>{formatTime(hours, minute)}</div>;
	}
);
TotalTimeDisplay.displayName = 'TotalTimeDisplay';

export const TotalDurationByDate = React.memo(
	({
		timesheetLog,
		createdAt,
		className
	}: {
		timesheetLog: TimesheetLog[];
		createdAt: Date | string;
		className?: string;
	}) => {
		const filteredLogs = timesheetLog.filter(
			(item) => formatDate(item.timesheet.createdAt) === formatDate(createdAt)
		);

		const totalDurationInSeconds = Array.isArray(filteredLogs)
			? filteredLogs.reduce((acc, item) => {
					const seconds = differenceBetweenHours(
						item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
						item.stoppedAt instanceof Date ? item.stoppedAt : new Date(item.stoppedAt)
					);
					return acc + seconds;
				}, 0)
			: 0;

		const { h: hours, m: minutes } = secondsToTime(totalDurationInSeconds);
		return <div className={clsxm('flex items-center text-[#868688]', className)}>{formatTime(hours, minutes)}</div>;
	}
);
TotalDurationByDate.displayName = 'TotalDurationByDate';
