import React from 'react';
import { TeamsProgressCircle, TeamsProgressCircleProps } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export function BasicProgressCircle({ ...props }: TeamsProgressCircleProps) {
	return <TeamsProgressCircle {...props} />;
}

export const InputBasicProgressCircle: Inputs[] = [
	{
		name: 'radius',
		type: 'number',
		defaultValue: 50,
		description: 'The radius of the progress circle.'
	},
	{
		name: 'strokeWidth',
		type: 'number',
		defaultValue: 10,
		description: "The width of the circle's stroke."
	}
];
