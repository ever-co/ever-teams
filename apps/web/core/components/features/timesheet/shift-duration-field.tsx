'use client';

import { useEffect } from 'react';
import { DurationField } from '@/core/components/features/manual-time/duration-field';
import { useDurationEntry } from '@/core/hooks/timesheet/use-duration-entry';
import { claimedIntervalsOf, type FormPeriod, timeOptionOf } from '@/core/lib/utils/dashboards/manual-time-entry';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';

export interface ShiftTimes {
	dateFrom: Date | string;
	startTime: string;
	endTime: string;
	/** What the dialog last heard from this field about saving: see `onSaveBlock`. */
	blocksSave?: boolean;
}

type MinutesOfOption = (option: string) => number;

/** The period's panel is already tinted: the field sits on it without a band of its own. */
const PANEL_FIELD = 'bg-transparent p-0';

function minutesOrNull(option: string, minutesOfOption: MinutesOfOption): number | null {
	if (!option) {
		return null;
	}
	return minutesOfOption(option);
}

function dayOfShift(shift: ShiftTimes): Date | null {
	if (!shift.dateFrom) {
		return null;
	}
	return new Date(shift.dateFrom);
}

function periodOfShift(shift: ShiftTimes, minutesOfOption: MinutesOfOption): FormPeriod {
	const startMinutes = minutesOrNull(shift.startTime, minutesOfOption);
	const endMinutes = minutesOrNull(shift.endTime, minutesOfOption);
	return { day: dayOfShift(shift), times: { startMinutes, endMinutes } };
}

/**
 * The duration of one period of the time entry dialog. The dialog's times are options such as `01:30:00 PM`, read
 * through its own `minutesOfOption`; a proposed interval goes back to it written the same way, and stays out of the
 * dialog's other periods.
 */
export function ShiftDurationField({
	shift,
	readShifts,
	index,
	employeeId,
	minutesOfOption,
	onTimes,
	onSaveBlock
}: Readonly<{
	shift: ShiftTimes;
	/** The dialog's periods as they are when called, the times one of them just received included. */
	readShifts: () => ReadonlyArray<ShiftTimes>;
	index: number;
	employeeId: string;
	minutesOfOption: MinutesOfOption;
	onTimes: (index: number, startTime: string, endTime: string) => void;
	/** Tells the dialog whether this period may be saved: not while the field refuses its text over earlier times. */
	onSaveBlock: (index: number, blocksSave: boolean) => void;
}>) {
	const period = periodOfShift(shift, minutesOfOption);

	const readClaimed = () => {
		const latestShifts = readShifts();
		const latestPeriods = latestShifts.map((latestShift) => periodOfShift(latestShift, minutesOfOption));
		return claimedIntervalsOf(latestPeriods, index);
	};

	const showInterval = (interval: TimeWindow | null) => {
		if (!interval) {
			onTimes(index, '', '');
			return;
		}
		const startTime = timeOptionOf(interval.start);
		const endTime = timeOptionOf(interval.end);
		onTimes(index, startTime, endTime);
	};

	const entry = useDurationEntry({
		employeeId: employeeId || null,
		day: period.day,
		startMinutes: period.times.startMinutes,
		endMinutes: period.times.endMinutes,
		readClaimed,
		onInterval: showInterval
	});

	// Told whenever the period holds another answer than the field's own, which also puts right a period that took
	// this panel's place after an earlier period was removed
	const isMarkedBlocking = shift.blocksSave === true;
	useEffect(() => {
		if (isMarkedBlocking !== entry.blocksSave) {
			onSaveBlock(index, entry.blocksSave);
		}
	}, [entry.blocksSave, index, isMarkedBlocking, onSaveBlock]);

	return <DurationField entry={entry} className={PANEL_FIELD} />;
}
