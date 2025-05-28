/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { clsxm } from '@/core/lib/utils';
import { StopCircleIcon, PauseIcon, TimerPlayIcon } from 'assets/svg';
import { capitalize } from 'lodash';
import moment from 'moment';
import { Tooltip } from '../duplicated-components/tooltip';
import { ETimerStatus } from '@/core/types/interfaces/enums/timer';

type Props = {
	status: ETimerStatus;
	showIcon?: boolean;
	tooltipClassName?: string;
	labelContainerClassName?: string;
} & IClassName;

export function TimerStatus({ status, className, showIcon = true, tooltipClassName, labelContainerClassName }: Props) {
	return (
		<Tooltip
			label={status === 'online' ? 'Online and Tracking Time' : capitalize(status)}
			enabled
			placement="auto"
			className={tooltipClassName}
			labelClassName="whitespace-nowrap"
			labelContainerClassName={labelContainerClassName}
		>
			<div
				className={clsxm(
					'flex items-center justify-center rounded-full',
					status === 'running' && ['bg-green-300'],
					status === 'online' && ['bg-green-300'],
					status === 'pause' && ['bg-[#EFCF9E]'],
					status === 'idle' && ['bg-[#F5BEBE]'],
					status === 'suspended' && ['bg-[#DCD6D6]'],
					className
				)}
			>
				{status === 'running' && showIcon && <TimerPlayIcon className="w-5 h-5 p-1 fill-green-700" />}
				{status === 'pause' && showIcon && <PauseIcon className="w-5 h-5 p-1 text-[#B87B1E]" />}
				{status === 'idle' && showIcon && <StopCircleIcon className="w-5 h-5 p-1 text-[#E65B5B]" />}

				{/* For now until we have realtime we will saw UserOnlineAndTrackingTimeIcon insted of UserOnlineIcon*/}
				{status === 'online' && showIcon && <TimerPlayIcon className="w-5 h-5 p-1 text-green-700" />}
				{/* <UserOnlineIcon className="w-5 h-5 p-1 fill-green-700" /> */}

				{status === 'suspended' && showIcon && <StopCircleIcon className="w-5 h-5 p-1 text-white" />}
			</div>
		</Tooltip>
	);
}

export function getTimerStatusValue(
	timerStatus: ITimerStatus | null,
	member: any | undefined,
	publicTeam?: boolean
): ETimerStatus {
	const isSuspended = () => !member?.employee?.isActive && !publicTeam;
	const isPaused = () => member?.timerStatus === 'pause';
	const shouldPauseDueToTimerStatus = () => {
		return (
			!timerStatus?.running &&
			timerStatus?.lastLog?.startedAt &&
			timerStatus?.lastLog?.employeeId === member?.employeeId &&
			moment().diff(moment(timerStatus?.lastLog?.startedAt), 'hours') < 24 &&
			timerStatus?.lastLog?.source !== 'TEAMS'
		);
	};
	const isOnline = () => member?.employee?.isOnline && member?.employee?.isTrackingTime;
	const isIdle = () => !member?.totalTodayTasks?.length;

	let status: ETimerStatus;

	if (isOnline()) {
		status = ETimerStatus.ONLINE;
	} else if (isIdle()) {
		status = ETimerStatus.IDLE;
	} else if (isPaused() || shouldPauseDueToTimerStatus()) {
		status = ETimerStatus.PAUSE;
	} else if (isSuspended()) {
		status = ETimerStatus.SUSPENDED;
	} else {
		status = member?.timerStatus || ETimerStatus.IDLE;
	}

	return status;
}
