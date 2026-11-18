'use client';

import React from 'react';
import Container from '../common/container';
import type { BasicTimerProps } from '../teams-basic-timer/timer';
import TimerIcon from '../teams-basic-timer/timer-icon';
import Clock from '../common/clock';
import TimerButton from '../teams-basic-timer/timer-button';
import TimerTime from './timer-time';
import { TimerCaption } from '../common/timer-caption';
import { TimeFormat } from '@lib/constants';

interface teamsBasicTimer extends BasicTimerProps {
	labeled?: boolean;
	format?: TimeFormat;
	separator?: string;
}

const teamsBasicTimer = ({
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
	caption,
	labeled,
	format = TimeFormat.DEFAULT,
	separator = 'default',
	...props
}: teamsBasicTimer & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	return (
		<Container className="gap-3" ref={ref} {...props}>
			{icon ? (
				<TimerIcon
					icon={<Clock />}
					{...(customIcon && { icon: customIcon })}
					className={iconClassName}
					size={labeled ? 'extra-large' : 'large'}
					variant={color}
				/>
			) : null}
			<TimerCaption>{caption}</TimerCaption>
			<TimerTime color={color} labeled={labeled} time={time} format={format} separator={separator} />
			{!readonly && (
				<TimerButton
					{...(customButtonIcon && { icon: customButtonIcon })}
					className={buttonClassName}
					isRunning={isRunning}
					size={labeled ? 'extra-large' : 'large'}
					variant={color}
				/>
			)}
		</Container>
	);
};

teamsBasicTimer.displayName = 'teamsBasicTimer';
export default teamsBasicTimer;
