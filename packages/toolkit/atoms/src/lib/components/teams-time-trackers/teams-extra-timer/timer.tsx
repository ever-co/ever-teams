'use client';

import React from 'react';
import Container from '../common/container';
import type { BasicTimerProps } from '../teams-basic-timer/timer';
import TimerIcon from '../teams-basic-timer/timer-icon';
import Clock from '../common/clock';
import TimerButton from '../teams-basic-timer/timer-button';
import TimerTime from './timer-time';

export interface TeamsExtraBaseTimerProps extends BasicTimerProps {
	labeled?: boolean;
}

const TeamsExtraBaseTimer = ({
	ref,
	time,
	color,
	icon,
	iconClassName,
	buttonClassName,
	customIcon,
	customButtonIcon,
	isRunning,
	readonly,
	labeled,
	...props
}: TeamsExtraBaseTimerProps & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	const { background, rounded, ...rest } = props;
	return (
		<Container ref={ref} {...rest}>
			{icon ? (
				<TimerIcon
					icon={<Clock />}
					{...(customIcon && { icon: customIcon })}
					className={iconClassName}
					size={labeled ? 'extra-large' : 'large'}
				/>
			) : null}
			<TimerTime background={background} color={color} labeled={labeled} rounded={rounded} time={time} />
			{!readonly && (
				<TimerButton
					{...(customButtonIcon && { icon: customButtonIcon })}
					className={buttonClassName}
					isRunning={isRunning}
					size={labeled ? 'extra-large' : 'large'}
				/>
			)}
		</Container>
	);
};

TeamsExtraBaseTimer.displayName = 'TeamsExtraBaseTimer';
export default TeamsExtraBaseTimer;
