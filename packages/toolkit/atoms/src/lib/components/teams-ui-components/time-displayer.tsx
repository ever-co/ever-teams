import { ITimerDisplayerProps } from '@ever-teams/toolkit-types';
import { cn, getTimeDigits } from '@ever-teams/toolkit-ui';

export interface TimeDisplayerProps extends ITimerDisplayerProps {
	hours?: number;
	minutes?: number;
	seconds?: number;
}

export const TimeDisplayer = ({
	separator = ':',
	fontSize = 12,
	fontWeight,
	fontFamily,
	className,
	hours: propHours,
	minutes: propMinutes,
	seconds: propSeconds
}: TimeDisplayerProps) => {
	// Use props if provided, otherwise fall back to context
	const hours = propHours ?? 0;
	const minutes = propMinutes ?? 0;
	const seconds = propSeconds ?? 0;

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
