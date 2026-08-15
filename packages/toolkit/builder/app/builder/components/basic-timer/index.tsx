import React from 'react';
import { TeamsBasicTimer as TeamsBasicTimerComponent, TeamsBasicTimerProps } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export const TeamsBasicTimer = ({ ...props }: TeamsBasicTimerProps) => {
	return <TeamsBasicTimerComponent {...props} />;
};

export const InputsBasicTimer: Inputs[] = [
	{
		name: 'readonly',
		type: 'boolean',
		defaultValue: true,
		helperText: 'Set the timer to read-only mode'
	},
	{
		name: 'icon',
		type: 'boolean',
		defaultValue: true,
		helperText: 'Show or hide the icon'
	},
	{
		name: 'background',
		type: 'string',
		enum: [
			{ label: 'Primary', value: 'primary' },
			{ label: 'Secondary', value: 'secondary' },
			{ label: 'Destructive', value: 'destructive' }
		],
		defaultValue: 'secondary',
		helperText: 'Select the background style for the component'
	},
	{
		name: 'rounded',
		type: 'string',
		enum: [
			{ label: 'Small', value: 'small' },
			{ label: 'Medium', value: 'medium' },
			{ label: 'Large', value: 'large' }
		],
		defaultValue: 'small',
		helperText: 'Select the border radius for the component'
	}
];
