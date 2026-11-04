import { atom } from 'jotai';

export type TTimerBillableChoice = {
	taskId: string;
	isBillable: boolean;
};

/** The billable value picked by hand before a start; it only applies to the task it was picked for. */
export const timerBillableChoiceState = atom<TTimerBillableChoice | null>(null);
