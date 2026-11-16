import { atom } from 'jotai';

/**
 * The labels picked for the next start, by id (Gauzy #12029): one value for every timer on screen, as the notes are.
 * Once the timer runs, its labels are the running entry's, read from the timer status.
 */
export const timerLabelsState = atom<string[]>([]);
