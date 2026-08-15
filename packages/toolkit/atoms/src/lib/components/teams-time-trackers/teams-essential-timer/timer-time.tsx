import type { ReactElement } from 'react';
import React from 'react';
import { cn, getTimeDigits } from '@ever-teams/toolkit-ui';
import type { Time, TimeVariances } from '../teams-basic-timer/timer-time';
import { timeVariants } from '../teams-basic-timer/timer-time';
import { TimeFormat } from '@lib/constants';
import { Separator } from './separator';
import { TimeLabels } from './time-labels';

export interface TimerTimeProps extends TimeVariances {
	time: Time;
	sx?: React.CSSProperties;
	labeled?: boolean;
	format?: TimeFormat;
	separator?: string;
	labelClassName?: string;
}

const formatTime = (
	time: Time,
	format: TimeFormat = TimeFormat.DEFAULT,
	separator: string = 'default'
): ReactElement | string => {
	const { hours, minutes, seconds } = time;

	const formatDefault = () => (
		<span className="inline-flex items-center gap-2">
			{getTimeDigits(hours)}
			<Separator separator={separator} />
			{getTimeDigits(minutes)}
			<Separator separator={separator} />
			{getTimeDigits(seconds)}
		</span>
	);

	const formatMap = {
		[TimeFormat.DEFAULT]: formatDefault,
		[TimeFormat.COMPACT]: () =>
			separator === 'default' ? (
				<span className="inline-flex items-center gap-2">
					{Number(hours)} <Separator separator={separator} />
					{Number(minutes)} <Separator separator={separator} />
					{Number(seconds)}
				</span>
			) : (
				<span className="inline-flex items-center gap-2">
					{Number(hours)}
					{separator}
					{Number(minutes)}
					{separator}
					{Number(seconds)}
				</span>
			),
		[TimeFormat.HOURS_MINUTES]: () =>
			separator === 'default' ? (
				<span className="inline-flex items-center gap-2">
					{Number(hours)} <Separator separator={separator} /> {Number(minutes)}
				</span>
			) : (
				<span className="inline-flex items-center gap-2">
					{Number(hours)} {separator} {Number(minutes)}
				</span>
			),
		[TimeFormat.WORDS]: () =>
			`${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`,
		[TimeFormat.MINIMAL]: () => `${hours}h ${minutes}m ${seconds}s`
	};

	return (formatMap[format] || formatMap[TimeFormat.DEFAULT])();
};

function TimerTime({
	time,
	sx,
	labeled,
	labelClassName,
	color,
	format = TimeFormat.DEFAULT,
	separator = 'default'
}: Readonly<TimerTimeProps>): ReactElement {
	const formattedTime = formatTime(time, format, separator);
	return (
		<div className={cn('inline-flex items-center justify-center text-4xl font-bold', timeVariants({ color }), sx)}>
			<div className="flex flex-col justify-center w-full">
				<div className="flex items-center justify-center">{formattedTime}</div>
				{labeled && <TimeLabels format={format} separator={separator} labelClassName={labelClassName} />}
			</div>
		</div>
	);
}

export default TimerTime;
