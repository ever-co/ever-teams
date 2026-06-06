import React from 'react';
import { TeamsReportDisplayer, IReportDisplayer } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export function CardTeamsReportDisplayer(props: IReportDisplayer) {
	return <TeamsReportDisplayer {...props} />;
}

export const InputCardTeamsReportDisplayer: Inputs[] = [
	{
		name: 'time',
		type: 'string'
	},
	{
		name: 'period',
		type: 'string'
	},
	{
		name: 'user',
		type: 'string',
		defaultValue: 'Salva'
	},
	{
		name: 'icon',
		type: 'ReactNode'
	}
];
