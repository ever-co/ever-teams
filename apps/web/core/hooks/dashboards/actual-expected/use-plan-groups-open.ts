'use client';

import { useCallback, useMemo, useState } from 'react';
import type { PlanGroup, PlanGrouping } from '@/core/lib/utils/dashboards/actual-expected';

/** Day groups past this many start closed, so a month never renders every member line at once. */
const OPEN_DAYS_BY_DEFAULT = 7;

function defaultOpenOf(grouping: PlanGrouping, index: number) {
	if (grouping === 'member') {
		return false;
	}
	return index < OPEN_DAYS_BY_DEFAULT;
}

function hasRows(group: PlanGroup) {
	return group.rows.length > 0;
}

export function usePlanGroupsOpen(groups: ReadonlyArray<PlanGroup>, grouping: PlanGrouping) {
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});

	const isOpenAt = useCallback(
		(key: string, index: number) => {
			const override = overrides[key];
			if (typeof override === 'boolean') {
				return override;
			}
			return defaultOpenOf(grouping, index);
		},
		[grouping, overrides]
	);

	const toggle = useCallback((key: string, wasOpen: boolean) => {
		setOverrides((current) => ({ ...current, [key]: !wasOpen }));
	}, []);

	const openableKeys = useMemo(() => {
		const openableGroups = groups.filter(hasRows);
		return openableGroups.map((group) => group.key);
	}, [groups]);

	const areAllOpen = useMemo(() => {
		let allOpen = true;
		groups.forEach((group, index) => {
			const isOpenable = hasRows(group);
			if (!isOpenable) {
				return;
			}
			const isOpen = isOpenAt(group.key, index);
			if (!isOpen) {
				allOpen = false;
			}
		});
		return allOpen;
	}, [groups, isOpenAt]);

	const toggleAll = useCallback(() => {
		const next: Record<string, boolean> = {};
		const nextState = !areAllOpen;
		for (const key of openableKeys) {
			next[key] = nextState;
		}
		setOverrides(next);
	}, [areAllOpen, openableKeys]);

	return {
		isOpenAt,
		toggle,
		toggleAll,
		areAllOpen,
		canToggleAll: openableKeys.length > 1
	};
}
