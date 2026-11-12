export const TIMER_NOTES_MAX_LENGTH = 1000;

/**
 * The notes of the timer: `timeLogId` names the running entry they belong to, null while they are a draft for the
 * next start.
 */
export interface TimerNotes {
	text: string;
	timeLogId: string | null;
}

export interface TimerNotesLog {
	id: string;
	description?: string | null;
}

export const EMPTY_TIMER_NOTES: TimerNotes = { text: '', timeLogId: null };

export function normalizedTimerNotes(text: string | null | undefined): string {
	const trimmed = (text ?? '').trim();
	return trimmed.slice(0, TIMER_NOTES_MAX_LENGTH);
}

/**
 * The notes once the running entry is known. A draft follows the entry that starts, an entry started or reloaded
 * elsewhere brings its own notes, and the notes of an entry that ended never carry over to the next one.
 */
export function timerNotesFor(notes: TimerNotes, runningLog: TimerNotesLog | null): TimerNotes {
	if (!runningLog) {
		if (notes.timeLogId === null) {
			return notes;
		}
		return EMPTY_TIMER_NOTES;
	}
	if (notes.timeLogId === runningLog.id) {
		return notes;
	}
	const isDraft = notes.timeLogId === null;
	const hasText = normalizedTimerNotes(notes.text) !== '';
	if (isDraft && hasText) {
		return { text: notes.text, timeLogId: runningLog.id };
	}
	return { text: runningLog.description ?? '', timeLogId: runningLog.id };
}

/** The notes a start sends: a draft only, never the notes of an earlier entry. Nothing when there are none. */
export function notesToSendAtStart(notes: TimerNotes): string | undefined {
	if (notes.timeLogId !== null) {
		return undefined;
	}
	const text = normalizedTimerNotes(notes.text);
	if (text === '') {
		return undefined;
	}
	return text;
}

/** The notes a stop sends: only what the member changed on the running entry, so an unchanged stop sends none. */
export function notesToSendAtStop(notes: TimerNotes, runningLog: TimerNotesLog | null | undefined): string | undefined {
	if (!runningLog) {
		return undefined;
	}
	if (notes.timeLogId !== runningLog.id) {
		return undefined;
	}
	const text = normalizedTimerNotes(notes.text);
	const savedText = normalizedTimerNotes(runningLog.description);
	if (text === savedText) {
		return undefined;
	}
	return text;
}

/**
 * Whether the stopped entry lost the notes its stop sent. An answer that does not show that entry proves nothing,
 * so it never reads as a loss.
 */
export function wereNotesLostAtStop(
	sentNotes: string | undefined,
	stoppedLogId: string | undefined,
	answeredLog: TimerNotesLog | null | undefined
): boolean {
	if (sentNotes === undefined) {
		return false;
	}
	if (!answeredLog) {
		return false;
	}
	if (answeredLog.id !== stoppedLogId) {
		return false;
	}
	return normalizedTimerNotes(answeredLog.description) !== sentNotes;
}

export type TimerNotesReading = { isValid: true; description?: string } | { isValid: false };

/** The notes of a request body, for the routes that forward a start or a stop: absent, usable or malformed. */
export function readTimerNotes(value: unknown): TimerNotesReading {
	if (value === undefined) {
		return { isValid: true };
	}
	if (typeof value !== 'string') {
		return { isValid: false };
	}
	if (value.length > TIMER_NOTES_MAX_LENGTH) {
		return { isValid: false };
	}
	return { isValid: true, description: value };
}

/**
 * The notes of a saved entry as the reports quote them, or null when it has none. Whole, whatever their length: the
 * limit of the timer field is not the API's, and an entry saved elsewhere can hold more.
 */
export function entryNotesOf(log: Pick<TimerNotesLog, 'description'>): string | null {
	const savedNotes = log.description ?? '';
	const notes = savedNotes.trim();
	if (notes === '') {
		return null;
	}
	return notes;
}
