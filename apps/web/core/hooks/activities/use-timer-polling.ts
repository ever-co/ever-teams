'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamIdState } from '@/core/stores';

/**
 * Hook to periodically invalidate team-related queries when timer is active.
 * This ensures real-time synchronization of employee statuses across multiple devices/browsers.
 *
 * When timer is running:
 * - Invalidates the active team detail query every 5 seconds
 * - Ensures "Working" | "Pause" | "Not Working" statuses are updated in real-time
 * - Syncs active task information across all team members
 *
 * When timer is stopped:
 * - Clears the polling interval
 * - Stops unnecessary API calls
 */
export function useTimerPolling(timerRunning: boolean) {
	const queryClient = useQueryClient();
	const activeTeamId = useAtomValue(activeTeamIdState);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Clear any existing interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		// Only set up polling if timer is running
		if (!timerRunning) {
			return;
		}

		// Set up polling interval to invalidate team queries every 5 seconds
		intervalRef.current = setInterval(() => {
			// Member timer data is only computed by the team detail endpoint, so refresh the active
			// team's detailByScope query (teamId at index 4) instead of every organization-teams query.
			if (activeTeamId) {
				queryClient.invalidateQueries({
					predicate: ({ queryKey }) =>
						queryKey[0] === 'organization-teams' &&
						queryKey[1] === 'detail-scope' &&
						queryKey[4] === activeTeamId
				});
			}

			// Invalidate working employees list to update "Working" tab count
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey;
					return (
						Array.isArray(key) &&
						key[0] === 'users' &&
						key[1] === 'employees' &&
						(key[2] === 'working' || key[2] === 'working-scope')
					);
				}
			});
		}, 5000); // Poll every 5 seconds

		// Cleanup function to clear interval on unmount or when timer stops
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
		// queryClient is a stable singleton from useQueryClient() and doesn't need to be in dependencies
	}, [timerRunning, activeTeamId]);
}
