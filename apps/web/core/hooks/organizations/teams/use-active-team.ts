'use client';

import { useToast } from '@/core/hooks/common/use-toast';
import { useCallback } from 'react';
import { TeamItem } from '@/core/components/teams/team-item';
import { useTranslations } from 'next-intl';
import { useOrganizationTeams } from './use-organization-teams';
import { useTimer } from '../../activities';

export const useActiveTeam = () => {
	const { activeTeam, setActiveTeam } = useOrganizationTeams();
	const { timerStatus, stopTimer } = useTimer();
	const t = useTranslations();
	const { toast } = useToast();
	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			if (item.data) {
				/**
				 * If timer started in Teams and user switches the Team, stop the timer
				 */
				if (
					timerStatus &&
					timerStatus?.running &&
					timerStatus.lastLog &&
					timerStatus.lastLog.organizationTeamId &&
					timerStatus.lastLog.source === 'TEAMS' &&
					activeTeam &&
					activeTeam?.id &&
					timerStatus.lastLog.organizationTeamId === activeTeam?.id
				) {
					toast({
						variant: 'default',
						title: t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'),
						description: t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_DESCRIPTION')
					});
					stopTimer();
				}

				setActiveTeam(item.data);
			}
		},
		[setActiveTeam, timerStatus, stopTimer, activeTeam, toast, t]
	);
	return { activeTeam, setActiveTeam, onChangeActiveTeam };
};
