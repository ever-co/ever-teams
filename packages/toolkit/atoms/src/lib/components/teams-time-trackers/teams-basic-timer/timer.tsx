'use client';

import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { ContainerProps, containerVariants } from '../common/container';
import Container from '../common/container';
import TimerButton from './timer-button';
import type { IconVariances } from './timer-icon';
import TimerIcon from './timer-icon';
import type { Time } from './timer-time';
import TimerTime from './timer-time';
import { TimerCaption } from '../common/timer-caption';

export type BasicTimerVariants = VariantProps<typeof containerVariants>;

export type ButtonBase = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;
export interface BasicTimerProps extends ButtonBase, BasicTimerVariants, ContainerProps {
	time: Time;
	isRunning?: boolean;
	icon?: boolean;
	readonly?: boolean;
	customIcon?: React.ReactNode;
	customButtonIcon?: React.ReactNode;
	iconClassName?: string;
	buttonClassName?: string;
	iconVariant?: IconVariances['variant'];
	align?: string;
	// Shown before the time; the kit's timers say "Today" (the time tracked today).
	caption?: React.ReactNode;
}

const TeamsBasicTimer = ({
	ref,
	time,
	size,
	color,
	icon,
	iconClassName,
	buttonClassName,
	customIcon,
	customButtonIcon,
	isRunning,
	readonly,
	caption,
	...props
}: BasicTimerProps & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	return (
		<Container ref={ref} {...props}>
			{icon ? (
				<TimerIcon
					{...(customIcon && { icon: customIcon })}
					className={iconClassName}
					size={size}
					variant={color}
				/>
			) : null}
			<TimerCaption>{caption}</TimerCaption>
			<TimerTime color={color} time={time} />
			{!readonly && (
				<TimerButton
					{...(customButtonIcon && { icon: customButtonIcon })}
					className={buttonClassName}
					isRunning={isRunning}
					size={size}
					variant={color}
				/>
			)}
		</Container>
	);
};

TeamsBasicTimer.displayName = 'TeamsBasicTimer';
export default TeamsBasicTimer;
