import React from 'react';
import { Input as Inputs } from '@builder.io/sdk';
import { ToggleThemeContainer } from '@ever-teams/atoms';

export const BasicTheme = ({ ...props }: any) => {
	return <ToggleThemeContainer {...props}></ToggleThemeContainer>;
};

export const InputBasicTheme: Inputs[] = [
	{
		name: 'className',
		type: 'string'
	}
];
