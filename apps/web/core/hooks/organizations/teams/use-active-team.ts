'use client';

import { TeamItem } from '@/core/components/teams/team-item';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTimer } from '../../activities';
import { useSetActiveTeam } from './use-set-active-team';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';

export const useActiveTeam = () => {
	const { data: activeTeamResult } = useGetOrganizationTeamQuery();
	const activeTeam = useMemo(() => activeTeamResult?.data ?? null, [activeTeamResult]);

	const setActiveTeam = useSetActiveTeam();
	const { timerStatus, stopTimer } = useTimer();
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
					toast.success(t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'), {
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
