'use client';

import { useCallback } from 'react';
import { TeamItem } from '@/core/components/teams/team-item';
import { useTranslations } from 'next-intl';
import { useCreateOrganizationTeam } from './use-create-organization-team';
import { useTimerActions } from '../../timer';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

export const useActiveTeam = () => {
	const activeTeam = useAtomValue(activeTeamState);
	const { setActiveTeam } = useCreateOrganizationTeam();
	const { timerStatus, stopTimer } = useTimerActions();
	const t = useTranslations();
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
					const announceTimerStopped = () => {
						toast.info(t('toasts.teams.TIMER_STOPPED_TEAM_CHANGE'));
					};
					const stopResult = stopTimer();
					const stopping = Promise.resolve(stopResult);
					void stopping.then(announceTimerStopped);
				}

				setActiveTeam(item.data);
			}
		},
		[setActiveTeam, timerStatus, stopTimer, activeTeam, t]
	);
	return { activeTeam, setActiveTeam, onChangeActiveTeam };
};
