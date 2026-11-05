import { atom } from 'jotai';

export type TTimerBillableChoices = Record<string, boolean>;

/** The billable value picked by hand before a start, by task id; a task without one starts from its project's. */
export const timerBillableChoicesState = atom<TTimerBillableChoices>({});
