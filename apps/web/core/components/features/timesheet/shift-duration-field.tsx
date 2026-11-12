'use client';

import { DurationField } from '@/core/components/features/manual-time/duration-field';
import { useDurationEntry } from '@/core/hooks/timesheet/use-duration-entry';
import { claimedIntervalsOf, type FormPeriod, timeOptionOf } from '@/core/lib/utils/dashboards/manual-time-entry';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';

export interface ShiftTimes {
	dateFrom: Date | string;
	startTime: string;
	endTime: string;
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
	shifts,
	index,
	employeeId,
	minutesOfOption,
	onTimes
}: Readonly<{
	shifts: ReadonlyArray<ShiftTimes>;
	index: number;
	employeeId: string;
	minutesOfOption: MinutesOfOption;
	onTimes: (index: number, startTime: string, endTime: string) => void;
}>) {
	const periods = shifts.map((shift) => periodOfShift(shift, minutesOfOption));
	const period = periods[index];
	const claimed = claimedIntervalsOf(periods, index);

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
		claimed,
		onInterval: showInterval
	});

	return <DurationField entry={entry} className={PANEL_FIELD} />;
}
