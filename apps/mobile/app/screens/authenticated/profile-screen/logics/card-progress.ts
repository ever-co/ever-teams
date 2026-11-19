type CardProgressInput = {
	/** The card shows the person signed in. */
	isAuthUser: boolean;
	/** The card's task is the one the person's timer runs on. */
	isActiveTask: boolean;
	/** The task's own worked seconds. */
	taskSeconds: number | undefined;
	/** The running total of the task the timer runs on, kept live while it runs. */
	activeTaskSeconds: number | undefined;
	estimate: number | null | undefined;
};

/** A card's share of its estimate in percent: the live total for the task one is timing, the task's own total otherwise. */
export function cardProgressOf({
	isAuthUser,
	isActiveTask,
	taskSeconds,
	activeTaskSeconds,
	estimate
}: CardProgressInput) {
	const isOwnRunningTask = isAuthUser && isActiveTask;
	let seconds = taskSeconds;
	if (isOwnRunningTask) {
		seconds = activeTaskSeconds;
	}
	const percent = ((seconds ?? Number.NaN) * 100) / (estimate ?? Number.NaN);
	if (Number.isNaN(percent)) {
		return 0;
	}
	return percent;
}
