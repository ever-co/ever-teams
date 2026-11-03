'use client';

import { useCallback, useState } from 'react';
import {
	defaultWorkingWeek,
	parseStoredWeek,
	serializeWeek,
	SlotField,
	Weekday,
	withDayWorking,
	withMondayCopiedToWeekdays,
	withSlotAdded,
	withSlotChanged,
	withSlotRemoved,
	workingHoursStorageKeyOf,
	WorkingWeek
} from '@/core/lib/utils/settings-working-hours';

function readWeek(userId: string): WorkingWeek {
	try {
		const key = workingHoursStorageKeyOf(userId);
		const raw = window.localStorage.getItem(key);
		const stored = parseStoredWeek(raw);
		return stored ?? defaultWorkingWeek();
	} catch {
		return defaultWorkingWeek();
	}
}

function writeWeek(userId: string, week: WorkingWeek): boolean {
	try {
		const key = workingHoursStorageKeyOf(userId);
		const serialized = serializeWeek(week);
		window.localStorage.setItem(key, serialized);
		return true;
	} catch {
		return false;
	}
}

/** Read in the initial state: the settings pages render on the client only, once the user is known. */
export function useWorkingHours(userId: string) {
	const [week, setWeek] = useState(() => readWeek(userId));
	const [saveFailed, setSaveFailed] = useState(false);

	const apply = useCallback(
		(change: (current: WorkingWeek) => WorkingWeek) => {
			const next = change(week);
			setWeek(next);
			const isSaved = writeWeek(userId, next);
			setSaveFailed(!isSaved);
		},
		[userId, week]
	);

	const setDayWorking = useCallback(
		(day: Weekday, isWorking: boolean) => apply((current) => withDayWorking(current, day, isWorking)),
		[apply]
	);

	const addSlot = useCallback((day: Weekday) => apply((current) => withSlotAdded(current, day)), [apply]);

	const removeSlot = useCallback(
		(day: Weekday, slotId: string) => apply((current) => withSlotRemoved(current, day, slotId)),
		[apply]
	);

	const changeSlot = useCallback(
		(day: Weekday, slotId: string, field: SlotField, value: string) =>
			apply((current) => withSlotChanged(current, day, slotId, field, value)),
		[apply]
	);

	const copyMondayToWeekdays = useCallback(() => apply(withMondayCopiedToWeekdays), [apply]);

	return {
		week,
		saveFailed,
		setDayWorking,
		addSlot,
		removeSlot,
		changeSlot,
		copyMondayToWeekdays
	};
}
