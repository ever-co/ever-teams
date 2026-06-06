import { ITimerDisplayerProps } from '@ever-teams/toolkit-types';
import { cn, getTimeDigits } from '@ever-teams/toolkit-ui';
import { TimeValues } from '@hooks/useTeamsStopWatch';

export interface TodayTimeDisplayerProps extends ITimerDisplayerProps {
	todayTrackedTime?: TimeValues;
}

export const TodayTimeDisplayer = ({
	separator = ':',
	fontSize = 12,
	fontWeight,
	fontFamily,
	className,
	todayTrackedTime: propTodayTrackedTime
}: TodayTimeDisplayerProps) => {
	// Use props if provided, otherwise fall back to 0
	const todayTrackedTime = propTodayTrackedTime ?? {
		hours: 0,
		minutes: 0,
		seconds: 0,
		totalSeconds: 0,
		milliseconds: 0,
		days: 0
	};
	const { hours, minutes, seconds } = todayTrackedTime!;

	const style: React.CSSProperties | undefined = {
		fontSize,
		fontFamily,
		fontWeight
	};

	return (
		<span style={style} className={cn(className)}>
			{getTimeDigits(hours)}
			{separator}
			{getTimeDigits(minutes)}
			{separator}
			{getTimeDigits(seconds)}
		</span>
	);
};
