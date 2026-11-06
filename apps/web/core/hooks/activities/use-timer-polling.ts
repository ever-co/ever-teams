'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamIdState } from '@/core/stores';

// The user's own start, stop and active-task change refetch the team at once (organizationTeams.all is invalidated
// by each of them): this cadence only brings in what the other members did.
const TRACKING_TEAM_REFRESH_INTERVAL_MS = 30_000;

function isTabHidden() {
	return document.visibilityState === 'hidden';
}

function isActiveTeamDetailKey(queryKey: readonly unknown[], activeTeamId: string) {
	const isTeamsKey = queryKey[0] === 'organization-teams';
	const isDetailScope = queryKey[1] === 'detail-scope';
	const isActiveTeam = queryKey[4] === activeTeamId;
	return isTeamsKey && isDetailScope && isActiveTeam;
}

const WORKING_EMPLOYEES_KINDS: ReadonlySet<unknown> = new Set(['working', 'working-scope']);

function isWorkingEmployeesKey(queryKey: readonly unknown[]) {
	const isUsersKey = queryKey[0] === 'users';
	const isEmployeesKey = queryKey[1] === 'employees';
	const isWorkingKind = WORKING_EMPLOYEES_KINDS.has(queryKey[2]);
	return isUsersKey && isEmployeesKey && isWorkingKind;
}

function refreshTrackedTeam(queryClient: QueryClient, activeTeamId: string | null) {
	// Member timer data is only computed by the team detail endpoint, so only the active team's detail is refreshed
	if (activeTeamId) {
		queryClient.invalidateQueries({
			predicate: ({ queryKey }) => isActiveTeamDetailKey(queryKey, activeTeamId)
		});
	}

	// The "Working" tab count
	queryClient.invalidateQueries({
		predicate: ({ queryKey }) => isWorkingEmployeesKey(queryKey)
	});
}

/**
 * While the user's own timer runs, refreshes the active team detail (members' "Working" / "Pause" / "Not Working"
 * statuses and active tasks) and the working employees every 30 seconds. Nothing is requested while the tab is
 * hidden; a refresh missed then runs as soon as the tab is visible again.
 */
export function useTimerPolling(timerRunning: boolean) {
	const queryClient = useQueryClient();
	const activeTeamId = useAtomValue(activeTeamIdState);

	useEffect(() => {
		if (!timerRunning) {
			return;
		}

		let missedWhileHidden = false;
		const refreshUnlessHidden = () => {
			if (isTabHidden()) {
				missedWhileHidden = true;
				return;
			}
			refreshTrackedTeam(queryClient, activeTeamId);
		};
		const catchUpWhenVisible = () => {
			const shouldCatchUp = missedWhileHidden && !isTabHidden();
			if (!shouldCatchUp) {
				return;
			}
			missedWhileHidden = false;
			refreshTrackedTeam(queryClient, activeTeamId);
		};

		const interval = setInterval(refreshUnlessHidden, TRACKING_TEAM_REFRESH_INTERVAL_MS);
		document.addEventListener('visibilitychange', catchUpWhenVisible);

		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', catchUpWhenVisible);
		};
	}, [timerRunning, activeTeamId, queryClient]);
}
