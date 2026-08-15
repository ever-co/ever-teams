'use client';

import {
	TeamsBasicTimer,
	TeamsLoginDialog,
	TeamsUserAvatar,
	TeamsModernTimer,
	useTeamsContext
} from '@ever-teams/atoms';
import { Button, Dialog, ThemedButton } from '@ever-teams/toolkit-ui';
import { ToggleThemeContainer } from './theme-toggle';
import React from 'react';
export function TopBar() {
	const { token } = useTeamsContext();

	return (
		<div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
			<div className="flex h-16 items-center px-8 gap-4">
				<div className="flex-1">
					<span className="text-lg font-semibold text-slate-900 dark:text-slate-100">Teams SDK</span>
				</div>

				<div className="flex items-center gap-4">
					<TeamsBasicTimer border="thick" icon progress rounded="large" />
					<ToggleThemeContainer />
					<TeamsLoginDialog />
				</div>
			</div>
		</div>
	);
}
