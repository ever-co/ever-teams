import React from 'react';
import { Minus } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn, getTimeDigits } from '@ever-teams/toolkit-ui';
import type { Time, TimeVariances } from '../teams-basic-timer/timer-time';

export const digitsVariants = cva('w-8 flex flex-col justify-center items-center p-1 ', {
	variants: {
		background: {
			none: 'transparent',
			destructive: 'bg-destructive dark:bg-destructive',
			secondary: 'bg-secondary dark:bg-secondary',
			primary: 'bg-primary dark:bg-primary'
		},
		rounded: {
			none: 'rounded-none',
			small: 'rounded-xl',
			medium: 'rounded-2xl',
			large: 'rounded-3xl'
		}
	},
	defaultVariants: {
		background: 'none',
		rounded: 'none'
	}
});

const timeVariants = cva('', {
	variants: {
		color: {
			none: 'text-none dark:text-none',
			primary: 'text-primary dark:text-primary',
			secondary: 'text-secondary dark:text-secondary',
			destructive: 'text-destructive dark:text-destructive'
		}
	},
	defaultVariants: {
		color: 'primary'
	}
});

export type DigitsVariances = VariantProps<typeof digitsVariants>;

export interface TimerTimeProps extends TimeVariances, DigitsVariances {
	time: Time;
	sx?: React.CSSProperties;
	labeled?: boolean;
}

// TODO: Must move this to be used dynamically
const Separator: React.FC = () => (
	<span className="inline-flex items-center justify-center">
		<Minus className="stroke-gray-400" size={10} />
	</span>
);

const TimerTime: React.FC<TimerTimeProps> = ({ time, sx, labeled, color, background, rounded }) => {
	const { hours, minutes, seconds } = time;

	return (
		<div className={cn('inline-flex items-center justify-center text-4xl font-bold', timeVariants({ color }), sx)}>
			<div className="flex flex-col justify-center">
				<div className="flex gap-1">
					{([hours, minutes, seconds] as number[]).map((unit, index) => (
						<React.Fragment key={['hours', 'minutes', 'seconds'][index]}>
							<div className={cn(digitsVariants({ background, rounded }))}>
								<span>{getTimeDigits(unit).split('')[0]}</span>
							</div>
							<div className={cn(digitsVariants({ background, rounded }))}>
								<span>{getTimeDigits(unit).split('')[1]}</span>
							</div>
							{index < 2 && <Separator />}
						</React.Fragment>
					))}
				</div>
				{labeled ? (
					<div className="flex justify-around text-black/80 dark:text-white">
						<span className="text-xs">Hours</span>
						<span className="text-xs">Minutes</span>
						<span className="text-xs">Seconds</span>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default TimerTime;
