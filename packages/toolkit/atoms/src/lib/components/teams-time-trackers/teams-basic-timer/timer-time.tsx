import type { ReactElement } from 'react';
import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn, getTimeDigits } from '@ever-teams/toolkit-ui';

export const timeVariants = cva('', {
	variants: {
		color: {
			none: 'text-none dark:text-none',
			primary: 'text-primary dark:text-primary',
			secondary: 'text-secondary dark:text-secondary',
			destructive: 'text-destructive dark:text-destructive'
		}
	},
	defaultVariants: {
		color: 'none'
	}
});

export type TimeVariances = VariantProps<typeof timeVariants>;

export interface Time {
	hours: number;
	minutes: number;
	seconds: number;
	totalSeconds: number;
}
interface TimerTimeProps extends TimeVariances {
	time: Time;
	sx?: React.CSSProperties;
}

// TODO: Must move this to be used dynamically
function Separator() {
	return <span className="inline-flex items-center justify-center">:</span>;
}

function TimerTime({ time, sx, color }: Readonly<TimerTimeProps>): ReactElement {
	const { hours, minutes, seconds } = time;
	return (
		<div className={cn('inline-flex items-center justify-center', timeVariants({ color }), sx)}>
			<div className="w-6">{getTimeDigits(hours)}</div>
			<Separator />
			<div className="w-6">{getTimeDigits(minutes)}</div>
			<Separator />
			<div className="w-6">{getTimeDigits(seconds)}</div>
		</div>
	);
}

export default TimerTime;
