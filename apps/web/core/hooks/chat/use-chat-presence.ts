'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useIsFetching } from '@tanstack/react-query';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { useTeamPresenceView } from '@/core/hooks/bootstrap/use-feature-data';
import { presenceByEmployee } from '@/core/lib/utils/chat-people';
import { queryKeys } from '@/core/query/keys';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { ETimerStatus } from '@/core/types/generics/enums/timer';

/**
 * The status dot of each person chat shows, by employee id: the same status the team page draws for a member (a
 * running or paused timer, online, idle, suspended), from the active team's members. The live channel's presence
 * events refresh the team, and so the dots; with `watching`, the team refreshes on its presence cadence while the
 * channel is down, as it does on the team page. People of other teams have no dot.
 */
export function useChatPresence(watching = false): ReadonlyMap<string, ETimerStatus> {
	useTeamPresenceView(watching);
	const team = useAtomValue(activeTeamState);
	const timerStatus = useAtomValue(timerStatusState);
	const members = team?.members;
	// A member's presence ages (a heartbeat counts for a few minutes): each refresh of the team works it out again,
	// even one that answers the same members. Without refreshes (auto refresh off) the dots stay as last read.
	const refreshing = useIsFetching({ queryKey: queryKeys.organizationTeams.all });
	return useMemo(
		() => presenceByEmployee(members ?? [], (member) => getTimerStatusValue(timerStatus, member, false)),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `refreshing` is the clock of the statuses, not an input
		[members, timerStatus, refreshing]
	);
}
