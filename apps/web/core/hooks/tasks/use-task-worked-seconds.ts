'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { activeTeamWorkedDurationByTaskState } from '@/core/stores';

/**
 * One task's worked time from the team statistics (getTaskTotalWorkedDuration's value): a component rendered once per
 * task re-renders when that number moves, not on every refresh of the team.
 */
export function useTaskWorkedSeconds(taskId: string | null | undefined) {
	const workedSecondsAtom = useMemo(
		() =>
			selectAtom(activeTeamWorkedDurationByTaskState, (durations) => {
				if (!taskId) {
					return 0;
				}
				return durations.get(taskId) ?? 0;
			}),
		[taskId]
	);
	return useAtomValue(workedSecondsAtom);
}
