'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';

import { timerNotesFor, type TimerNotesLog } from '@/core/lib/utils/timer/timer-notes';
import { timerNotesState, timerStatusState } from '@/core/stores';

/**
 * The notes of the timer, for the field that edits them. It also keeps them in step with the running entry: a draft
 * follows the entry that starts, a reload reads the running entry's notes back, an entry that ended leaves none.
 */
export function useTimerNotes() {
	const [notes, setNotes] = useAtom(timerNotesState);
	const timerStatus = useAtomValue(timerStatusState);
	const isStatusKnown = timerStatus !== null;
	const isRunning = timerStatus?.running === true;
	const lastLog = timerStatus?.lastLog;
	let runningLogId: string | undefined;
	if (isRunning) {
		runningLogId = lastLog?.id;
	}
	const runningLogDescription = lastLog?.description;

	useEffect(() => {
		// The status is emptied while a team opens: nothing is known about the entry then, so the notes stay
		if (!isStatusKnown) {
			return;
		}
		let runningLog: TimerNotesLog | null = null;
		if (runningLogId) {
			runningLog = { id: runningLogId, description: runningLogDescription };
		}
		setNotes((current) => timerNotesFor(current, runningLog));
	}, [isStatusKnown, runningLogDescription, runningLogId, setNotes]);

	const setText = useCallback(
		(text: string) => {
			setNotes((current) => ({ ...current, text }));
		},
		[setNotes]
	);

	return { text: notes.text, setText, isRunning: Boolean(runningLogId) };
}
