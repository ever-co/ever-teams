import { ITeamTask, Nullable, TimesheetLog } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';
import { differenceBetweenHours, formatDate, secondsToTime } from '@/app/helpers';
import { ClockIcon } from "@radix-ui/react-icons"
import React from 'react';
import { CalendarArrowDown, UserPlusIcon } from 'lucide-react';

type Props = {
	task: Nullable<ITeamTask>;
	className?: string;
	taskTitleClassName?: string;
	taskNumberClassName?: string;
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
		<Tooltip label={task?.title || ''} placement="top" enabled={(task?.title && task?.title.length > 60) || false}>
			<span className="flex items-center">
				{task && (
					// Show task issue and task number
					<div>
						<div className="inline-flex items-center">
							<div className="mr-1">
								<TaskIssueStatus showIssueLabels={false} className={clsxm(className)} task={task} />
							</div>
						</div>
					</div>
				)}
				<span className={clsxm('font-normal', taskTitleClassName)}>
					<span className={clsxm('text-gray-500 mr-1 font-normal', taskNumberClassName)}>
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
	<div className="flex justify-start items-start w-10">
		<span>{String(hours).padStart(2, '0')}</span>
		<span>:</span>
		<span>{String(minutes).padStart(2, '0')}</span>
		<span>:</span>
		<span>{String(second).padStart(2, '0')}</span>
	</div>
);

export const DisplayTimeForTimesheet = ({ timesheetLog, logType }: { timesheetLog: TimesheetLog, logType?: 'TRACKED' | 'MANUAL' | 'IDLE' | undefined }) => {

	const seconds = differenceBetweenHours(
		timesheetLog.startedAt instanceof Date ? timesheetLog.startedAt : new Date(timesheetLog.startedAt),
		timesheetLog.stoppedAt instanceof Date ? timesheetLog.stoppedAt : new Date(timesheetLog.stoppedAt)
	);

	const { h: hours, m: minute, s: second } = secondsToTime(seconds);

	const iconClasses = 'text-[14px] h-4 w-4';
	const icons = {
		MANUAL: <UserPlusIcon className={`text-red-500 ${iconClasses}`} />,
		TRACKED: <ClockIcon className={`text-green-400 ${iconClasses}`} />,
		IDLE: <CalendarArrowDown className={`text-yellow-400 ${iconClasses}`} />,
	};
	const resolvedLogType: keyof typeof icons = logType ?? 'TRACKED';
	return (
		<div className="flex items-start justify-start font-medium gap-x-1">
			{icons[resolvedLogType]}
			<div className="flex items-start justify-start text-[#282048] dark:text-[#9b8ae1]">
				{formatTime(hours, minute, second)}
			</div>
		</div>
	);
}


export const TotalTimeDisplay = React.memo(({ timesheetLog }: { timesheetLog: TimesheetLog[] }) => {

	const totalDuration = Array.isArray(timesheetLog)
		? timesheetLog.reduce((acc, item) => {
			const seconds = differenceBetweenHours(
				item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
				item.stoppedAt instanceof Date ? item.stoppedAt : new Date(item.stoppedAt)
			);
			return acc + seconds
		}, 0)
		: 0;

	const { h: hours, m: minute, s: second } = secondsToTime(totalDuration || 0);
	return (
		<div className="flex items-center text-[#868688]">
			{formatTime(hours, minute, second)}
		</div>)
});
TotalTimeDisplay.displayName = 'TotalTimeDisplay';


export const TotalDurationByDate = React.memo(
	({ timesheetLog, createdAt, className }: { timesheetLog: TimesheetLog[]; createdAt: Date | string, className?: string }) => {
		const targetDateISO = new Date(createdAt).toISOString();

		const filteredLogs = timesheetLog.filter(
			(item) => formatDate(item.timesheet.createdAt) === formatDate(targetDateISO));

		const totalDurationInSeconds = Array.isArray(filteredLogs)
			? filteredLogs.reduce((acc, item) => {
				const seconds = differenceBetweenHours(
					item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
					item.stoppedAt instanceof Date ? item.stoppedAt : new Date(item.stoppedAt)
				)
				return acc + seconds
			}, 0)
			: 0;

		const { h: hours, m: minutes, s: second } = secondsToTime(totalDurationInSeconds);
		return (
			<div className={clsxm("flex items-center text-[#868688]", className)}>
				{formatTime(hours, minutes, second)}
			</div>
		);
	}
);
TotalDurationByDate.displayName = 'TotalDurationByDate';
