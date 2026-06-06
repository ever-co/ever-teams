import React from 'react';
import { TeamsProgress } from '@ever-teams/atoms';
import { ITeamsProgressProps } from '@ever-teams/toolkit-types';
export function BasicTeamsProgress({ ...props }: ITeamsProgressProps) {
	return <TeamsProgress {...props} />;
}
