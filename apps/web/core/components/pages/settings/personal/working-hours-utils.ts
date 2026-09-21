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

export const WORKDAY_ROW_CLASS =
	'grid grid-cols-[minmax(0,1fr)_2rem] items-start gap-x-3 border-t py-3 dark:border-white/10 sm:grid-cols-[10rem_minmax(0,1fr)_2rem]';

export function initializeWorkSchedule(days: WorkDayInput[], createId = () => crypto.randomUUID()): WorkDay[] {
	return days.map((day) => ({
		...day,
		timeSlots: day.timeSlots.map((slot) => ({
			...slot,
			id: slot.id || `slot-${createId()}`
		}))
	}));
}
