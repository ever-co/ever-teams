import React from 'react';
import { TeamsModernTimer } from '../../drag-components/timer/modern-teams';
import { BaseTimer } from '../../drag-components/timer/base-timer';
import { TeamsEssentialTimerComp } from '../../drag-components/timer/teams-basic-timer';
import { TimerButton } from '../../drag-components/timer/timer-button';
import { ModernTeamsProps, TeamsEssentialTimerProps, BaseTimerProps } from '../../drag-components';
import { ComponentDefinition } from '../../../types/component-types';

export const timerComponents: ComponentDefinition[] = [
	{
		label: 'Modern Teams Timer',
		id: 'ModernTeamsTimer',
		component: <TeamsModernTimer {...ModernTeamsProps} />,
		imageSrc: '/components/modern-teams.png'
	},
	{
		label: 'Teams Timer Button',
		id: 'TeamsTimerButton',
		component: <TimerButton size="default" />,
		imageSrc: '/components/teams-button.png'
	},
	{
		label: 'Teams Essential Timer',
		id: 'TeamsEssentialTimer',
		component: <TeamsEssentialTimerComp {...TeamsEssentialTimerProps} />,
		imageSrc: '/components/basic-teams.png'
	},
	{
		label: 'Teams Base Timer',
		id: 'TeamsBaseTimer',
		component: <BaseTimer {...BaseTimerProps} />,
		imageSrc: '/components/basic-timer.png'
	}
];
