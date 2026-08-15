'use client';
import React from 'react';
import { TeamsModernTimer as MTeams, useAccessToken } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export const TeamsModernTimer = ({ separator, expandable, showProgress }: any) => {
	return (
		<div>
			<MTeams separator={separator} expandable={expandable} showProgress={showProgress}></MTeams>
		</div>
	);
};
export const InputModernTeams: Inputs[] = [
	{
		name: 'showProgress',
		type: 'boolean',
		defaultValue: false
	},
	{
		name: 'expandable',
		type: 'boolean',
		defaultValue: true
	}
];
