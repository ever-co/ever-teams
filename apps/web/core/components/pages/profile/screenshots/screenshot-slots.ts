import { useMemo } from 'react';
import type { TTimeSlot } from '@/core/types/schemas';

/** What a tile needs to offer Delete: the delete call and the rule of `useTimeSlots`, read once for the whole view. */
export interface ScreenshotSlotActions {
	deleteTimeSlots: (ids: string[]) => Promise<void>;
	canDeleteTimeSlots: boolean;
	ownEmployeeId?: string;
	canActForOthers: boolean;
}

export interface SlotScreenshot {
	id?: string;
	thumbUrl?: string;
	fullUrl?: string;
	recordedAt?: string | Date;
}

export interface ScreenshotHour {
	key: string;
	start: Date;
	end: Date;
	slots: TTimeSlot[];
}

const MILLISECONDS_PER_HOUR = 3_600_000;

export function useScreenshotSlotActions(state: ScreenshotSlotActions): ScreenshotSlotActions {
	const { deleteTimeSlots, canDeleteTimeSlots, ownEmployeeId, canActForOthers } = state;
	return useMemo(
		() => ({ deleteTimeSlots, canDeleteTimeSlots, ownEmployeeId, canActForOthers }),
		[deleteTimeSlots, canDeleteTimeSlots, ownEmployeeId, canActForOthers]
	);
}

/** A slot that names its owner is judged on its own; otherwise by the slots of the member on screen. */
export function canDeleteSlotWith(actions: ScreenshotSlotActions, ownerEmployeeId?: string): boolean {
	if (!ownerEmployeeId) {
		return actions.canDeleteTimeSlots;
	}
	const isOwnSlot = ownerEmployeeId === actions.ownEmployeeId;
	return isOwnSlot || actions.canActForOthers;
}

export function screenshotsOf(slot: TTimeSlot): SlotScreenshot[] {
	const screenshots: SlotScreenshot[] = slot.screenshots ?? [];
	return screenshots;
}

export function hasAnyScreenshot(timeSlots: ReadonlyArray<TTimeSlot>) {
	return timeSlots.some((slot) => screenshotsOf(slot).length > 0);
}

/** The day's mean activity, or null when nothing was tracked: a mean of no slot is not 0%. */
export function averageActivityOf(timeSlots: ReadonlyArray<TTimeSlot>): number | null {
	if (timeSlots.length === 0) {
		return null;
	}
	let total = 0;
	for (const slot of timeSlots) {
		total += slot.percentage ?? 0;
	}
	return total / timeSlots.length;
}

function hourStartOf(value: Date | string) {
	const date = new Date(value);
	date.setMinutes(0, 0, 0);
	return date;
}

function startTimeOf(slot: TTimeSlot) {
	const start = new Date(slot.startedAt);
	return start.getTime();
}

function bySlotStart(first: TTimeSlot, second: TTimeSlot) {
	return startTimeOf(first) - startTimeOf(second);
}

function byLatestHourFirst(first: ScreenshotHour, second: ScreenshotHour) {
	return second.start.getTime() - first.start.getTime();
}

/** Slots by the local hour they start in, the latest hour first and the slots of an hour in time order. */
export function screenshotHoursOf(timeSlots: ReadonlyArray<TTimeSlot>): ScreenshotHour[] {
	const hoursByStart = new Map<number, ScreenshotHour>();
	for (const slot of timeSlots) {
		const start = hourStartOf(slot.startedAt);
		const startTime = start.getTime();
		const existing = hoursByStart.get(startTime);
		if (existing) {
			existing.slots.push(slot);
			continue;
		}
		const end = new Date(startTime + MILLISECONDS_PER_HOUR);
		hoursByStart.set(startTime, { key: String(startTime), start, end, slots: [slot] });
	}
	const hours = [...hoursByStart.values()];
	for (const hour of hours) {
		hour.slots.sort(bySlotStart);
	}
	return hours.sort(byLatestHourFirst);
}

function isValidDate(date: Date) {
	const time = date.getTime();
	return !Number.isNaN(time);
}

/** `09:10 – 09:20` in the reader's form, or the start alone when the slot has no end yet. */
export function slotRangeTextOf(format: Intl.DateTimeFormat, start: Date | string, end?: Date | string | null) {
	const startDate = new Date(start);
	if (!isValidDate(startDate)) {
		return '';
	}
	if (!end) {
		return format.format(startDate);
	}
	const endDate = new Date(end);
	if (!isValidDate(endDate)) {
		return format.format(startDate);
	}
	return format.formatRange(startDate, endDate);
}

export function formatDateValue(format: Intl.DateTimeFormat, value: Date | string | undefined) {
	if (!value) {
		return '';
	}
	const date = new Date(value);
	if (!isValidDate(date)) {
		return '';
	}
	return format.format(date);
}
