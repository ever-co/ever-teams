import type { TTimerStartNotes } from '@/core/stores/timer/timer-start-notes';

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * How long handed notes wait for their start. A start can be held back (a daily plan dialog, tracking turned off):
 * past this delay the notes are dropped, so they never ride on a later, unrelated start of the same task.
 */
export const START_NOTES_LIFETIME_MS = 2 * MILLISECONDS_PER_MINUTE;

export function startNotesOf(
	taskId: string,
	description: string | null | undefined,
	now: number
): TTimerStartNotes | null {
	const notes = description?.trim();
	if (!notes) {
		return null;
	}
	return { taskId, description: notes, handedAt: now };
}

/** What a start of `taskId` sends as its notes: the ones handed for that task a moment ago, otherwise none. */
export function notesForStartOf(pending: TTimerStartNotes | null, taskId: string, now: number): string | undefined {
	if (!pending) {
		return undefined;
	}
	const isForTask = pending.taskId === taskId;
	if (!isForTask) {
		return undefined;
	}
	const age = now - pending.handedAt;
	const isFresh = age <= START_NOTES_LIFETIME_MS;
	if (!isFresh) {
		return undefined;
	}
	return pending.description;
}
