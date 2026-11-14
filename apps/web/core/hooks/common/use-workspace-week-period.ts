'use client';

import { useCallback, useMemo, useState, type SetStateAction } from 'react';
import type { Period, WeekStart } from '@/core/lib/utils/dashboard-period';
import { useWorkspaceWeekStart } from './use-workspace-week-start';

/**
 * A report's period: its default follows the workspace's week start, which may be read after the page opened or
 * saved while it is open, until the person picks a period; then the picked one stays. `defaultOf` must keep its
 * identity between renders (a module function, or a memoized one).
 */
export function useWorkspaceWeekPeriod(
	defaultOf: (weekStart: WeekStart) => Period
): readonly [Period, (next: SetStateAction<Period>) => void] {
	const weekStart = useWorkspaceWeekStart();
	const defaultPeriod = useMemo(() => defaultOf(weekStart), [defaultOf, weekStart]);
	const [pickedPeriod, setPickedPeriod] = useState<Period | null>(null);
	const period = pickedPeriod ?? defaultPeriod;

	const setPeriod = useCallback(
		(next: SetStateAction<Period>) => {
			setPickedPeriod((picked) => {
				const shown = picked ?? defaultPeriod;
				if (typeof next === 'function') {
					return next(shown);
				}
				return next;
			});
		},
		[defaultPeriod]
	);

	return [period, setPeriod] as const;
}
