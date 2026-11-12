import type { TTimerStartNotes } from '@/core/stores/timer/timer-start-notes';

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

/**
 * What a start of `taskId` sends as its notes: the ones handed for that task, otherwise none. However long the start
 * waited (a daily plan dialog filled in first), the notes wait with it: the continuation that handed them takes them
 * back once it is given up, so they never ride on a later, unrelated start of the same task.
 */
export function notesForStartOf(pending: TTimerStartNotes | null, taskId: string): string | undefined {
	if (!pending) {
		return undefined;
	}
	const isForTask = pending.taskId === taskId;
	if (!isForTask) {
		return undefined;
	}
	return pending.description;
}
