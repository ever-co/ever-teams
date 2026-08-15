import React from 'react';
import { TeamsButton, useTimer } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

interface IBasicTeamsButton {
	size: 'default' | 'sm' | 'lg';
}
export function BasicTeamsButton({ size }: IBasicTeamsButton) {
	const { isRunning, startTimer, stopTimer, timerLoading } = useTimer();
	return (
		<TeamsButton
			isRunning={isRunning}
			startTimer={startTimer}
			stopTimer={stopTimer}
			timerLoading={timerLoading}
			size={size == 'sm' ? 'sm' : 'default'}
		/>
	);
}

export const InputTeamsButton: Inputs[] = [
	{
		name: 'size',
		type: 'enum',
		defaultValue: 'default',
		enum: [
			{ label: 'Default', value: 'default' },
			{ label: 'Small', value: 'sm' },
			{ label: 'Large', value: 'lg' }
		]
	}
];
