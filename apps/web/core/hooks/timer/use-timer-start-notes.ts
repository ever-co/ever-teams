'use client';

import { useStore } from 'jotai';
import { useCallback } from 'react';

import { notesForStartOf, startNotesOf } from '@/core/lib/utils/timer/timer-start-notes';
import { type TTimerStartNotes, timerStartNotesState } from '@/core/stores/timer/timer-start-notes';

type JotaiStore = ReturnType<typeof useStore>;

/**
 * Whatever notes wait for a start, taken out of the store. A start takes them as it is asked, before its checks: a
 * daily plan dialog asks for the start and closes at once, and its closing gives up notes still waiting.
 */
export function takePendingTimerStartNotes(store: JotaiStore): TTimerStartNotes | null {
	const pending = store.get(timerStartNotesState);
	if (!pending) {
		return null;
	}
	store.set(timerStartNotesState, null);
	return pending;
}

/** The notes a start of `taskId` sends, taken out of the store: whatever was waiting there is gone after any start. */
export function takeTimerStartNotes(store: JotaiStore, taskId: string): string | undefined {
	const pending = takePendingTimerStartNotes(store);
	return notesForStartOf(pending, taskId);
}

export function useTimerStartNotes() {
	const store = useStore();

	/** Hands the notes to the next start of the task, and answers what was handed, to take it back if given up. */
	const handNotes = useCallback(
		(taskId: string, description: string | null | undefined) => {
			const notes = startNotesOf(taskId, description, Date.now());
			store.set(timerStartNotesState, notes);
			return notes;
		},
		[store]
	);

	const dropNotes = useCallback(
		(taskId: string) => {
			const pending = store.get(timerStartNotesState);
			const isForTask = pending?.taskId === taskId;
			if (isForTask) {
				store.set(timerStartNotesState, null);
			}
		},
		[store]
	);

	/** Takes back notes `handNotes` answered, unless a start took them or other notes were handed since. */
	const dropHandedNotes = useCallback(
		(handed: TTimerStartNotes | null) => {
			if (!handed) {
				return;
			}
			const isStillWaiting = store.get(timerStartNotesState) === handed;
			if (isStillWaiting) {
				store.set(timerStartNotesState, null);
			}
		},
		[store]
	);

	return { handNotes, dropNotes, dropHandedNotes };
}
