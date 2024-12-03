import { ITeamTask, Nullable, TimesheetLog } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import { TaskIssueStatus } from './task-issue';
import { formatDate, secondsToTime } from '@/app/helpers';
import { ClockIcon } from "@radix-ui/react-icons"
import React from 'react';

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

const formatTime = (hours: number, minutes: number) => (
	<div className="flex items-center">
		<span>{String(hours).padStart(2, '0')}</span>
		<span>:</span>
		<span>{String(minutes).padStart(2, '0')}</span>
	</div>
);

export const DisplayTimeForTimesheet = ({ duration }: { duration: number }) => {
	if (duration < 0) {
		console.warn('Negative duration provided to DisplayTimeForTimesheet');
		duration = 0;
	}
	const { h: hours, m: minute } = secondsToTime(duration || 0);
	return (
		<div className='flex items-center font-medium gap-x-1'>
			<ClockIcon className='text-green-400 text-[14px] h-4 w-4' />
			<div className='flex items-center text-[#282048] dark:text-[#9b8ae1]'>
				{formatTime(hours, minute)}
			</div>
		</div>
	)

}

export const TotalTimeDisplay = React.memo(({ timesheetLog }: { timesheetLog: TimesheetLog[] }) => {
	const totalDuration = Array.isArray(timesheetLog)
		? timesheetLog.reduce((acc, curr) => acc + (curr.timesheet?.duration || 0), 0)
		: 0;
	const { h: hours, m: minute } = secondsToTime(totalDuration || 0);
	return (
		<div className="flex items-center text-[#868688]">
			{formatTime(hours, minute)}
		</div>)
});
TotalTimeDisplay.displayName = 'TotalTimeDisplay';


export const TotalDurationByDate = React.memo(
	({ timesheetLog, createdAt, className }: { timesheetLog: TimesheetLog[]; createdAt: Date | string, className?: string }) => {
		console.log("========================>", createdAt)
		const targetDateISO = new Date(createdAt).toISOString();
		const filteredLogs = timesheetLog.filter(
			(item) => formatDate(item.timesheet.createdAt) === formatDate(targetDateISO));
		const totalDurationInSeconds = filteredLogs.reduce(
			(total, log) => total + (log.timesheet?.duration || 0), 0);
		const { h: hours, m: minutes } = secondsToTime(totalDurationInSeconds);
		return (
			<div className={clsxm("flex items-center text-[#868688]", className)}>
				{formatTime(hours, minutes)}
			</div>
		);
	}
);
TotalDurationByDate.displayName = 'TotalDurationByDate';
