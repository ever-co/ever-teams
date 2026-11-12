import { atom } from 'jotai';

import { EMPTY_TIMER_NOTES, type TimerNotes } from '@/core/lib/utils/timer/timer-notes';

/** One value for every timer on screen: the notes typed beside the main timer are the ones the header timer sends. */
export const timerNotesState = atom<TimerNotes>(EMPTY_TIMER_NOTES);
