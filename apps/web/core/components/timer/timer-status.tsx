/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { clsxm } from '@/core/lib/utils';
import { StopCircleIcon, PauseIcon, TimerPlayIcon } from 'assets/svg';
import { Tooltip } from '../duplicated-components/tooltip';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { OnlineIcon } from '../icons';
import { differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { TIMER_STATUS_CONSTANTS } from '@/core/constants/config/constants';

type Props = {
	status: ETimerStatus;
	showIcon?: boolean;
	tooltipClassName?: string;
	labelContainerClassName?: string;
} & IClassName;

export function TimerStatus({ status, className, showIcon = true, tooltipClassName, labelContainerClassName }: Props) {
	const classStatusMap = {
		running: 'bg-green-300',
		online: 'bg-green-300',
		pause: 'bg-[#EFCF9E]',
		idle: 'bg-[#F5BEBE]',
		suspended: 'bg-[#DCD6D6]'
	};
	const iconStatusMap = {
		running: <TimerPlayIcon className="p-1 w-5 h-5 fill-green-700" />,
		pause: <PauseIcon className="w-5 h-5 p-1 text-[#B87B1E]" />,
		idle: <StopCircleIcon className="w-5 h-5 p-1 text-[#E65B5B]" />,
		online: <OnlineIcon className="p-1 w-5 h-5 text-green-700 animate-pulse fill-green-700" />,
		suspended: <StopCircleIcon className="p-1 w-5 h-5 text-white" />
	};
	const tooltipLabelMap = {
		online: 'User is Online',
		running: 'User is Online and Tracking Time',
		idle: 'User is Idle',
		pause: 'User is Paused',
		suspended: 'User is Suspended'
	};
	return (
		<Tooltip
			label={tooltipLabelMap[status as keyof typeof tooltipLabelMap]}
			enabled
			placement="auto"
			className={tooltipClassName}
			labelClassName="whitespace-nowrap"
			labelContainerClassName={labelContainerClassName}
		>
			<div
				className={clsxm(
					'flex items-center justify-center rounded-full',
					status && classStatusMap[status as keyof typeof classStatusMap],
					className
				)}
			>
				{status && showIcon && iconStatusMap[status as keyof typeof iconStatusMap]}
			</div>
		</Tooltip>
	);
}
export function getTimerStatusValue(
	timerStatus: ITimerStatus | null,
	member: any | undefined,
	publicTeam?: boolean
): ETimerStatus {
	// Early return if no member
	if (!member) {
		return ETimerStatus.IDLE;
	}
	const { employee, timerStatus: memberTimerStatus, employeeId, totalTodayTasks } = member;

	// Conditions of status organized by logical priority
	const conditions = {
		isSuspended: (): boolean => !employee?.isActive && !publicTeam,

		isExplicitlyPaused: (): boolean => memberTimerStatus === TIMER_STATUS_CONSTANTS.PAUSE,

		shouldPauseDueToTimerStatus: (): boolean => {
			if (!timerStatus?.lastLog) return false;

			const { lastLog } = timerStatus;
			const isRecentActivity =
				differenceInHours(new Date(), new Date(lastLog.startedAt || '')) <
				TIMER_STATUS_CONSTANTS.HOURS_THRESHOLD;

			return !!(
				!timerStatus.running &&
				lastLog.startedAt &&
				lastLog.employeeId === employeeId &&
				isRecentActivity &&
				lastLog.source !== TIMER_STATUS_CONSTANTS.TEAMS_SOURCE
			);
		},

		isRunning: (): boolean => Boolean(employee?.isOnline && employee?.isTrackingTime),

		isOnline: (): boolean => Boolean(employee?.isOnline),

		isIdle: (): boolean => !totalTodayTasks?.length
	};
	// Clear and readable logic
	if (conditions.isSuspended()) {
		return ETimerStatus.SUSPENDED;
	}

	if (conditions.isExplicitlyPaused() || conditions.shouldPauseDueToTimerStatus()) {
		return ETimerStatus.PAUSE;
	}

	if (conditions.isRunning()) {
		return ETimerStatus.RUNNING;
	}

	if (conditions.isOnline()) {
		return ETimerStatus.ONLINE;
	}

	if (conditions.isIdle()) {
		return ETimerStatus.IDLE;
	}

	// Fallback with a safe default value
	return (memberTimerStatus as ETimerStatus) || ETimerStatus.IDLE;
}

// Version with validation and logging for a production environment
export function getTimerStatusValueWithValidation(
	timerStatus: ITimerStatus | null,
	member: any | undefined,
	publicTeam = false
): ETimerStatus {
	try {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	} catch (error) {
		toast.error('Error determining timer status', {
			description: JSON.stringify({ member, timerStatus, publicTeam })
		});
		return ETimerStatus.IDLE;
	}
}
