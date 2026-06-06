'use client';

import React from 'react';
import { cn } from '@ever-teams/toolkit-ui';
import Container from '../common/container';
import type { BasicTimerProps } from '../teams-basic-timer/timer';
import TimerIcon from '../teams-basic-timer/timer-icon';
import Clock from '../common/clock';
import TimerButton from '../teams-basic-timer/timer-button';
import TimerTime from './timer-time';

export interface TeamsCustomBaseTimerProps extends BasicTimerProps {
	labeled?: boolean;
	labelClassName?: string;
}

const TeamsCustomBaseTimer = ({
	ref,
	time,
	color,
	icon,
	iconClassName = 'text-black',
	buttonClassName,
	customIcon,
	customButtonIcon,
	isRunning,
	readonly,
	labeled,
	labelClassName = 'text-black',
	...props
}: TeamsCustomBaseTimerProps & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	const { background, rounded, ...rest } = props;
	return (
		<Container ref={ref} {...rest}>
			{icon ? (
				<TimerIcon
					icon={<Clock />}
					{...(customIcon && { icon: customIcon })}
					className={cn(labeled && 'mb-3', iconClassName)}
					size={labeled ? 'extra-large' : 'large'}
				/>
			) : null}
			<TimerTime
				background={background}
				color={color}
				labelClassName={labelClassName}
				labeled={labeled}
				rounded={rounded}
				time={time}
			/>
			{!readonly && (
				<TimerButton
					{...(customButtonIcon && { icon: customButtonIcon })}
					className={cn(labeled && 'mb-3', buttonClassName)}
					isRunning={isRunning}
					size={labeled ? 'extra-large' : 'large'}
					variant="primary"
				/>
			)}
		</Container>
	);
};

TeamsCustomBaseTimer.displayName = 'TeamsCustomBaseTimer';
export default TeamsCustomBaseTimer;
