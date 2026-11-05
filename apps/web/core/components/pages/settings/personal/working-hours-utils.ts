export type TimeSlotInput = {
	id?: string;
	startTime: string;
	endTime: string;
};

export type WorkDayInput = {
	day: string;
	timeSlots: TimeSlotInput[];
	enabled: boolean;
};

export type TimeSlot = TimeSlotInput & { id: string };
export type WorkDay = Omit<WorkDayInput, 'timeSlots'> & { timeSlots: TimeSlot[] };

/** A day row: the day toggle, its time slots, the add button; the label column widens with the other settings rows. */
export const WORKDAY_ROW_CLASS =
	'grid grid-cols-[minmax(0,1fr)_2rem] items-start gap-x-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)_2rem] md:grid-cols-[14rem_minmax(0,1fr)_2rem] md:gap-x-8';

export function initializeWorkSchedule(days: WorkDayInput[], createId = () => crypto.randomUUID()): WorkDay[] {
	return days.map((day) => ({
		...day,
		timeSlots: day.timeSlots.map((slot) => ({
			...slot,
			id: slot.id || `slot-${createId()}`
		}))
	}));
}
