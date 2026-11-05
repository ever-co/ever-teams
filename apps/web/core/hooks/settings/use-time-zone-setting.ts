'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useTimezoneSettings } from '@/core/hooks/common/use-timezone-settings';
import { detectTimeZone, formatStoredTimeZone, timeZoneDisplayOf } from '@/core/lib/utils/settings-time-zone';

export function useTimeZoneSetting() {
	const { data: user } = useUserQuery();
	const { updateAvatar } = useSettings();
	const { setActiveTimezone } = useTimezoneSettings();
	const [pendingZone, setPendingZone] = useState<string | null>(null);
	const userId = user?.id;
	const storedValue = user?.timeZone ?? null;

	const shownValue = useMemo(() => {
		if (pendingZone) {
			return formatStoredTimeZone(pendingZone);
		}
		return storedValue;
	}, [pendingZone, storedValue]);

	const display = useMemo(() => timeZoneDisplayOf(shownValue), [shownValue]);
	const currentZone = display?.zone ?? null;

	const saveZone = useCallback(
		async (zone: string) => {
			const value = formatStoredTimeZone(zone);
			setActiveTimezone(value);
			if (!userId) {
				return false;
			}
			const isUnchanged = value === storedValue;
			if (isUnchanged) {
				return true;
			}
			setPendingZone(zone);
			try {
				await updateAvatar({ timeZone: value, id: userId });
				return true;
			} catch {
				return false;
			} finally {
				setPendingZone(null);
			}
		},
		[setActiveTimezone, storedValue, updateAvatar, userId]
	);

	const detect = useCallback(async () => {
		const zone = detectTimeZone();
		const isSaved = await saveZone(zone);
		if (!isSaved) {
			return null;
		}
		return zone;
	}, [saveZone]);

	return {
		currentZone,
		display,
		isSaving: pendingZone !== null,
		saveZone,
		detect
	};
}

/** Timesheets and reports fall back to UTC for a user without a time zone. */
export function useFillMissingTimeZone() {
	const { data: user } = useUserQuery();
	const { updateAvatar } = useSettings();
	const { setActiveTimezone } = useTimezoneSettings();
	const hasFilled = useRef(false);
	const userId = user?.id;
	const hasTimeZone = Boolean(user?.timeZone);

	useEffect(() => {
		if (hasFilled.current) {
			return;
		}
		if (!userId) {
			return;
		}
		if (hasTimeZone) {
			return;
		}
		hasFilled.current = true;
		const zone = detectTimeZone();
		const value = formatStoredTimeZone(zone);
		setActiveTimezone(value);
		updateAvatar({ timeZone: value, id: userId }).catch(() => undefined);
	}, [hasTimeZone, setActiveTimezone, updateAvatar, userId]);
}
