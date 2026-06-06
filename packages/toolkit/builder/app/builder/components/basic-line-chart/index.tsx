import React from 'react';
import { TeamsChart } from '@ever-teams/atoms';
import { IChartProps } from '@ever-teams/toolkit-types';

export function BasicLineChart({ ...props }: IChartProps) {
	return <TeamsChart type="line" />;
}
