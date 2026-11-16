import { atom } from 'jotai';
import type { TimerLabelsSave } from '@/core/lib/utils/timer-status-labels';

/**
 * The labels picked for the next start, by id (Gauzy #12029): one value for every timer on screen, as the notes are.
 * Once the timer runs, its labels are the running entry's, read from the timer status.
 */
export const timerLabelsState = atom<string[]>([]);

/**
 * The labels last saved on a running entry and when the save landed (#5368): a status read asked before then keeps
 * them rather than putting back the labels the run had before.
 */
export const timerLabelsSavedState = atom<TimerLabelsSave | null>(null);
