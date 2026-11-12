'use client';

import { useStore } from 'jotai';
import { useCallback } from 'react';

import { notesForStartOf, startNotesOf } from '@/core/lib/utils/timer/timer-start-notes';
import { timerStartNotesState } from '@/core/stores/timer/timer-start-notes';

type JotaiStore = ReturnType<typeof useStore>;

/** The notes a start of `taskId` sends, taken out of the store: whatever was waiting there is gone after any start. */
export function takeTimerStartNotes(store: JotaiStore, taskId: string): string | undefined {
	const pending = store.get(timerStartNotesState);
	if (!pending) {
		return undefined;
	}
	store.set(timerStartNotesState, null);
	return notesForStartOf(pending, taskId, Date.now());
}

export function useTimerStartNotes() {
	const store = useStore();

	const handNotes = useCallback(
		(taskId: string, description: string | null | undefined) => {
			const notes = startNotesOf(taskId, description, Date.now());
			store.set(timerStartNotesState, notes);
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

	return { handNotes, dropNotes };
}
