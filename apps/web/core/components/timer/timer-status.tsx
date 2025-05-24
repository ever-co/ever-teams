/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName, ITimerStatus, ITimerStatusEnum, IOrganizationTeamMember } from '@/core/types/interfaces/to-review';
import { clsxm } from '@/core/lib/utils';
import { StopCircleIcon, PauseIcon, TimerPlayIcon } from 'assets/svg';
import { capitalize } from 'lodash';
import moment from 'moment';
import { Tooltip } from '../duplicated-components/tooltip';

type Props = {
	status: ITimerStatusEnum;
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
	member: IOrganizationTeamMember | undefined,
	publicTeam?: boolean
): ITimerStatusEnum {
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

	let status: ITimerStatusEnum;

	if (isOnline()) {
		status = 'online';
	} else if (isIdle()) {
		status = 'idle';
	} else if (isPaused() || shouldPauseDueToTimerStatus()) {
		status = 'pause';
	} else if (isSuspended()) {
		status = 'suspended';
	} else {
		status = member?.timerStatus || 'idle';
	}

	return status;
}
