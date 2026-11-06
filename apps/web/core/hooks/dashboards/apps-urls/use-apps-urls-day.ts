'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMemberDayActivities } from '@/core/hooks/dashboards/activity/use-member-day-activities';
import { appDayOf } from '@/core/lib/utils/dashboards/app-activity';
import type { AppUsageRow } from '@/core/lib/utils/dashboards/apps-urls';
import {
	activeDayKeysOf,
	dayMembersOf,
	dayOfKey,
	defaultDayMemberIdOf
} from '@/core/lib/utils/dashboards/apps-urls-day';

function shownDayKeyOf(dayKeys: ReadonlyArray<string>, pickedKey: string | null) {
	const isAvailable = pickedKey !== null && dayKeys.includes(pickedKey);
	if (isAvailable) {
		return pickedKey;
	}
	return dayKeys.at(-1) ?? null;
}

/**
 * One member's day in apps and sites, for the Apps & URLs page: the member (picked, else the viewer, else the one with
 * the most time) and the day (picked, else their latest day with time), stepping only between days that have some.
 */
export function useAppsUrlsDay({
	rows,
	selectedEmployeeIds,
	ownEmployeeId
}: Readonly<{
	rows: ReadonlyArray<AppUsageRow>;
	selectedEmployeeIds: ReadonlyArray<string>;
	ownEmployeeId: string | null;
}>) {
	const [pickedEmployeeId, setPickedEmployeeId] = useState<string | null>(null);
	const [pickedDayKey, setPickedDayKey] = useState<string | null>(null);
	const members = useMemo(() => dayMembersOf(rows), [rows]);
	const defaultEmployeeId = defaultDayMemberIdOf(members, selectedEmployeeIds, ownEmployeeId);
	const isPickedKnown = members.some((member) => member.id === pickedEmployeeId);
	let employeeId = defaultEmployeeId;
	if (isPickedKnown) {
		employeeId = pickedEmployeeId;
	}
	const member = members.find((item) => item.id === employeeId) ?? null;
	const dayKeys = useMemo(() => activeDayKeysOf(rows, employeeId), [employeeId, rows]);
	const dayKey = shownDayKeyOf(dayKeys, pickedDayKey);
	const day = useMemo(() => dayOfKey(dayKey ?? '1970-01-01'), [dayKey]);
	const hasDay = dayKey !== null;
	const state = useMemberDayActivities({ employeeId, day, isEnabled: hasDay });
	const appDay = useMemo(() => appDayOf(state.activities, day, new Date()), [day, state.activities]);
	const dayIndex = dayKeys.indexOf(dayKey ?? '');
	const canGoBack = dayIndex > 0;
	const lastIndex = dayKeys.length - 1;
	const canGoForward = dayIndex >= 0 && dayIndex < lastIndex;

	const goToPreviousDay = useCallback(() => {
		const previous = dayKeys[dayIndex - 1];
		if (previous) {
			setPickedDayKey(previous);
		}
	}, [dayIndex, dayKeys]);
	const goToNextDay = useCallback(() => {
		const next = dayKeys[dayIndex + 1];
		if (next) {
			setPickedDayKey(next);
		}
	}, [dayIndex, dayKeys]);

	return {
		members,
		member,
		pickMember: setPickedEmployeeId,
		day,
		hasDay,
		appDay,
		canGoBack,
		canGoForward,
		goToPreviousDay,
		goToNextDay,
		isLoading: state.isLoading,
		isError: state.isError,
		refetch: state.refetch
	};
}

export type AppsUrlsDayState = ReturnType<typeof useAppsUrlsDay>;
