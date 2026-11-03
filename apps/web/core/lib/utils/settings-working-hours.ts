/**
 * Gauzy has no weekly schedule contract (only dated availability records), so the week is kept in this browser,
 * per user.
 */

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

const WORKDAYS: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const COPIED_WEEKDAYS: readonly Weekday[] = ['tuesday', 'wednesday', 'thursday', 'friday'];

export interface WorkingSlot {
	id: string;
	start: string;
	end: string;
}

export interface WorkingDay {
	day: Weekday;
	isWorking: boolean;
	slots: WorkingSlot[];
}

export type WorkingWeek = WorkingDay[];

export type SlotField = 'start' | 'end';

export type SlotProblem = 'order' | 'overlap';

const STORAGE_PREFIX = 'ever-teams:working-hours:';

const STORAGE_VERSION = 1;

const DEFAULT_START = '09:00';

const DEFAULT_END = '17:00';

const MINUTES_PER_HOUR = 60;

const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const SECONDS_PER_MINUTE = 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface StoredWeek {
	version: number;
	days: WorkingWeek;
}

let slotIdSequence = 0;

export function createSlotId(): string {
	const hasRandomUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
	if (hasRandomUuid) {
		return crypto.randomUUID();
	}
	slotIdSequence += 1;
	const time = Date.now().toString(36);
	const sequence = slotIdSequence.toString(36);
	return `${time}-${sequence}`;
}

export function workingHoursStorageKeyOf(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`;
}

function slotOf(start: string, end: string): WorkingSlot {
	return { id: createSlotId(), start, end };
}

export function defaultWorkingWeek(): WorkingWeek {
	return WEEKDAYS.map((day) => {
		const isWorking = WORKDAYS.includes(day);
		if (!isWorking) {
			return { day, isWorking, slots: [] };
		}
		const firstSlot = slotOf(DEFAULT_START, DEFAULT_END);
		return { day, isWorking, slots: [firstSlot] };
	});
}

export function minutesOfTime(value: string): number | null {
	const match = TIME_PATTERN.exec(value);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	return hours * MINUTES_PER_HOUR + minutes;
}

function timeOfMinutes(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
	const minutes = totalMinutes % MINUTES_PER_HOUR;
	const paddedHours = String(hours).padStart(2, '0');
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${paddedHours}:${paddedMinutes}`;
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [];
}

function slotBounds(slot: WorkingSlot | undefined): { start: number; end: number } | null {
	if (!slot) {
		return null;
	}
	const start = minutesOfTime(slot.start);
	const end = minutesOfTime(slot.end);
	if (start === null) {
		return null;
	}
	if (end === null) {
		return null;
	}
	return { start, end };
}

export function slotProblemOf(day: WorkingDay, index: number): SlotProblem | null {
	const slot = day.slots[index];
	const bounds = slotBounds(slot);
	if (!bounds) {
		return 'order';
	}
	const endsAfterStart = bounds.end > bounds.start;
	if (!endsAfterStart) {
		return 'order';
	}
	const earlierSlots = day.slots.slice(0, index);
	const overlapsEarlier = earlierSlots.some((earlier) => {
		const earlierBounds = slotBounds(earlier);
		if (!earlierBounds) {
			return false;
		}
		const startsBeforeEarlierEnds = bounds.start < earlierBounds.end;
		const endsAfterEarlierStarts = bounds.end > earlierBounds.start;
		return startsBeforeEarlierEnds && endsAfterEarlierStarts;
	});
	if (overlapsEarlier) {
		return 'overlap';
	}
	return null;
}

export function daySeconds(day: WorkingDay): number {
	if (!day.isWorking) {
		return 0;
	}
	let totalMinutes = 0;
	day.slots.forEach((slot, index) => {
		const problem = slotProblemOf(day, index);
		const bounds = slotBounds(slot);
		if (problem || !bounds) {
			return;
		}
		totalMinutes += bounds.end - bounds.start;
	});
	return totalMinutes * SECONDS_PER_MINUTE;
}

function nextSlotOf(day: WorkingDay): WorkingSlot {
	const lastSlot = day.slots[day.slots.length - 1];
	const lastBounds = slotBounds(lastSlot);
	if (!lastBounds) {
		return slotOf(DEFAULT_START, DEFAULT_END);
	}
	const lastEnd = lastBounds.end;
	const nextEnd = lastEnd + MINUTES_PER_HOUR;
	const fitsInDay = nextEnd < MINUTES_PER_DAY;
	if (!fitsInDay) {
		return slotOf(DEFAULT_START, DEFAULT_END);
	}
	const start = timeOfMinutes(lastEnd);
	const end = timeOfMinutes(nextEnd);
	return slotOf(start, end);
}

function withDay(week: WorkingWeek, weekday: Weekday, change: (day: WorkingDay) => WorkingDay): WorkingWeek {
	return week.map((day) => {
		if (day.day !== weekday) {
			return day;
		}
		return change(day);
	});
}

export function withDayWorking(week: WorkingWeek, weekday: Weekday, isWorking: boolean): WorkingWeek {
	return withDay(week, weekday, (day) => {
		const needsSlot = isWorking && day.slots.length === 0;
		if (needsSlot) {
			const firstSlot = slotOf(DEFAULT_START, DEFAULT_END);
			return { ...day, isWorking, slots: [firstSlot] };
		}
		return { ...day, isWorking };
	});
}

export function withSlotAdded(week: WorkingWeek, weekday: Weekday): WorkingWeek {
	return withDay(week, weekday, (day) => {
		const added = nextSlotOf(day);
		return { ...day, slots: [...day.slots, added] };
	});
}

export function withSlotRemoved(week: WorkingWeek, weekday: Weekday, slotId: string): WorkingWeek {
	return withDay(week, weekday, (day) => {
		const slots = day.slots.filter((slot) => slot.id !== slotId);
		return { ...day, slots };
	});
}

export function withSlotChanged(
	week: WorkingWeek,
	weekday: Weekday,
	slotId: string,
	field: SlotField,
	value: string
): WorkingWeek {
	return withDay(week, weekday, (day) => {
		const slots = day.slots.map((slot) => {
			if (slot.id !== slotId) {
				return slot;
			}
			return { ...slot, [field]: value };
		});
		return { ...day, slots };
	});
}

/** Each copied range gets a new id, so each day edits its own copy. */
export function withMondayCopiedToWeekdays(week: WorkingWeek): WorkingWeek {
	const monday = week.find((day) => day.day === 'monday');
	if (!monday) {
		return week;
	}
	return week.map((day) => {
		const isCopied = COPIED_WEEKDAYS.includes(day.day);
		if (!isCopied) {
			return day;
		}
		const slots = monday.slots.map((slot) => slotOf(slot.start, slot.end));
		return { ...day, isWorking: monday.isWorking, slots };
	});
}

function isWeekday(value: unknown): value is Weekday {
	return WEEKDAYS.some((day) => day === value);
}

function isStoredSlot(value: unknown): value is WorkingSlot {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const candidate = value as Partial<WorkingSlot>;
	const hasId = typeof candidate.id === 'string';
	const hasStart = typeof candidate.start === 'string';
	const hasEnd = typeof candidate.end === 'string';
	return hasId && hasStart && hasEnd;
}

function storedDayOf(value: unknown): WorkingDay | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	const candidate = value as Partial<WorkingDay>;
	if (!isWeekday(candidate.day)) {
		return null;
	}
	const rawSlots = arrayOrEmpty<unknown>(candidate.slots);
	const slots = rawSlots.filter(isStoredSlot);
	return { day: candidate.day, isWorking: candidate.isWorking === true, slots };
}

export function parseStoredWeek(raw: string | null): WorkingWeek | null {
	if (!raw) {
		return null;
	}
	let parsed: Partial<StoredWeek>;
	try {
		parsed = JSON.parse(raw) as Partial<StoredWeek>;
	} catch {
		return null;
	}
	const isCurrentVersion = parsed.version === STORAGE_VERSION;
	if (!isCurrentVersion) {
		return null;
	}
	const rawDays = arrayOrEmpty<unknown>(parsed.days);
	const storedDays = rawDays.map(storedDayOf);
	const fallback = defaultWorkingWeek();
	return fallback.map((defaultDay) => {
		const stored = storedDays.find((day) => day?.day === defaultDay.day);
		return stored ?? defaultDay;
	});
}

export function serializeWeek(week: WorkingWeek): string {
	const stored: StoredWeek = { version: STORAGE_VERSION, days: week };
	return JSON.stringify(stored);
}
