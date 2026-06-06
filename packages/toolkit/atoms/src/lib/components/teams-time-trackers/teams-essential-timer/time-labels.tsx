import { ReactElement } from 'react';
import { cn } from '@ever-teams/toolkit-ui';
import { TimeFormat } from '@lib/constants';

interface TimeLabelsProps {
	format: TimeFormat;
	separator: string;
	labelClassName?: string;
}

export const TimeLabels = ({ format, labelClassName }: TimeLabelsProps): ReactElement => (
	<div className={cn('flex justify-around', labelClassName)}>
		{format === TimeFormat.DEFAULT ? (
			<>
				<span className="text-xs">Hours</span>
				<span className="text-xs">Minutes</span>
				<span className="text-xs">Seconds</span>
			</>
		) : format === TimeFormat.HOURS_MINUTES ? (
			<>
				<span className="text-xs">Hrs</span>
				<span className="text-xs">Min</span>
			</>
		) : format === TimeFormat.COMPACT ? (
			<>
				<span className="text-xs">H</span>
				<span className="text-xs">M</span>
				<span className="text-xs">S</span>
			</>
		) : null}
	</div>
);
