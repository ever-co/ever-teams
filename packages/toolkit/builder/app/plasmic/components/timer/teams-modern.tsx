'use client';
import React from 'react';
import { TeamsModernTimer as MTeams } from '@ever-teams/atoms';

export const TeamsModernCloc = ({ separator, expandable, showProgress }: any) => {
	return (
		<div>
			<MTeams separator={separator} expandable={expandable} showProgress={showProgress}></MTeams>
		</div>
	);
};
