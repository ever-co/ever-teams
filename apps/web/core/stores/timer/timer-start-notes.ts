import { atom } from 'jotai';

export interface TTimerStartNotes {
	taskId: string;
	description: string;
	/** When the notes were handed over, in epoch milliseconds. */
	handedAt: number;
}

/** The notes of a continued entry, waiting for the start of its task: that start sends them and empties this. */
export const timerStartNotesState = atom<TTimerStartNotes | null>(null);
