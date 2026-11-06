/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { clsxm } from '@/core/lib/utils';
import { Tooltip } from '../duplicated-components/tooltip';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { OnlineIcon, Pause, Play, StopCircle } from '../icons';
import { differenceInHours } from 'date-fns';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { TIMER_STATUS_CONSTANTS } from '@/core/constants/config/constants';
import { getMemberPresence } from '@/core/lib/utils/team-members.utils';
import { useTranslations } from 'next-intl';

type Props = {
	status: ETimerStatus;
	showIcon?: boolean;
	/** `sm` fits the icon to 32-36px avatars (16px badge); `md` is the 20px badge of larger avatars. */
	size?: 'sm' | 'md';
	tooltipClassName?: string;
	labelContainerClassName?: string;
} & IClassName;

const ICON_SIZE = {
	sm: 'size-4 p-[3px]',
	md: 'size-5 p-1'
} as const;

export function TimerStatus({
	status,
	className,
	showIcon = true,
	size = 'md',
	tooltipClassName,
	labelContainerClassName
}: Props) {
	const t = useTranslations();
	const iconSize = ICON_SIZE[size];
	const classStatusMap = {
		running: 'bg-success',
		online: 'bg-success',
		pause: 'bg-warning',
		idle: 'bg-muted-foreground/60',
		suspended: 'bg-muted-foreground/30'
	};
	const iconStatusMap = {
		running: <Play className={clsxm(iconSize, 'rounded-full bg-success/15 text-success-foreground')} />,
		pause: <Pause className={clsxm(iconSize, 'rounded-full bg-warning/15 text-warning-foreground')} />,
		idle: <StopCircle className={clsxm(iconSize, 'rounded-full bg-foreground/5 text-muted-foreground')} />,
		online: <OnlineIcon className={clsxm(iconSize, 'rounded-full bg-success/15 text-success-foreground')} />,
		suspended: <StopCircle className={clsxm(iconSize, 'rounded-full bg-foreground/10 text-muted-foreground')} />
	};
	const statusFillClassName = status && classStatusMap[status as keyof typeof classStatusMap];
	const isDot = !showIcon;
	const tooltipLabelMap = {
		online: t('timer.presence.ONLINE'),
		running: t('timer.presence.RUNNING'),
		idle: t('timer.presence.IDLE'),
		pause: t('timer.presence.PAUSE'),
		suspended: t('timer.presence.SUSPENDED')
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
					isDot && statusFillClassName,
					showIcon && 'bg-card',
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

		isTracking: (): boolean => Boolean(employee?.isTrackingTime) || memberTimerStatus === ETimerStatus.RUNNING,

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

	// Tracking and pause keep the badge they have today (a manager still sees "worked today, paused"); for anyone
	// else a recent heartbeat wins. The public team payload carries no heartbeat, so a public view never shows
	// presence. getMemberFilterStatus applies the same rule to the team filters and their counts.
	if (!conditions.isTracking()) {
		const presence = getMemberPresence(employee);
		if (presence === 'online') return ETimerStatus.ONLINE;
		if (presence === 'idle') return ETimerStatus.IDLE;
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
		logErrorInDev('Error determining timer status', { error, member, timerStatus, publicTeam });
		return ETimerStatus.IDLE;
	}
}
