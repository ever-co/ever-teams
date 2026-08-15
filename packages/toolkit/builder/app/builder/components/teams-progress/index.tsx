import React from 'react';
import { TeamsProgress } from '@ever-teams/atoms';
import { ITeamsProgressProps } from '@ever-teams/toolkit-types';
import { Input as Inputs } from '@builder.io/sdk';

export function BasicTeamsProgress({ ...props }: ITeamsProgressProps) {
	return <TeamsProgress {...props} />;
}

export const InputTeamsProgress: Inputs[] = [
	{
		name: 'className',
		type: 'string'
	}
];
