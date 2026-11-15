/**
 * The guards every timer command shares: a start, a stop, a toggle, a discard, a break, and the stop at its last
 * heartbeat of a run the app did not follow (#5123). Module scope on purpose: every task card, the timer and the shell
 * mount their own useTimerApi, and a ref only guards the instance that owns it. A guard is held until its timer request
 * lands, not through the bookkeeping that follows (active task update, invalidations), so it never swallows a later
 * start or stop.
 */

/** `blocked`: nothing was sent, and a toast already told the user why. A failed request rejects instead. */
export type TimerStartOutcome = 'started' | 'blocked';

let pendingStart: Promise<TimerStartOutcome> | null = null;
let pendingStartTaskId: string | null = null;
// Bumped when a command is sent and again when it lands. A sync reads the status back after its time slot, so that
// read may predate such a command: it only updates the status when none was in flight when the sync started and none
// happened meanwhile.
let commandSeq = 0;
let commandsInFlight = 0;

export function trackTimerCommand<T>(request: Promise<T>): Promise<T> {
	commandSeq += 1;
	commandsInFlight += 1;
	return request.finally(() => {
		commandSeq += 1;
		commandsInFlight -= 1;
	});
}

/** Where the commands stand as a status read starts, or null while one is in flight: the read may predate it. */
export function timerCommandMark(): number | null {
	return commandsInFlight === 0 ? commandSeq : null;
}

/** Whether no command was sent or landed since the mark was taken: a status read from then is still the latest. */
export function isTimerCommandMarkCurrent(mark: number | null): boolean {
	return mark === commandSeq;
}

/**
 * The timer start in flight, from the click through its request, or null (#5025). Creating a workspace waits for it:
 * the creation signs the browser in to the new workspace, and a start landing afterwards would leave a timer running
 * in the workspace left behind, out of sight.
 */
export function pendingTimerStart(): Promise<TimerStartOutcome> | null {
	return pendingStart;
}

/** The task the start in flight starts, or null when it names none. */
export function pendingTimerStartTaskId(): string | null {
	return pendingStartTaskId;
}

/** Holds the start guard for a start of the timer, until releaseStartGuard. */
export function holdStartGuard(request: Promise<TimerStartOutcome>, taskId: string | null): void {
	pendingStart = request;
	pendingStartTaskId = taskId;
}

// Identity check: an older flow settling late must not clear the guard of a newer request
export function releaseStartGuard(request: Promise<TimerStartOutcome>): void {
	if (pendingStart !== request) return;
	pendingStart = null;
	pendingStartTaskId = null;
}

/**
 * Runs a command this hook does not send itself under the shared start guard: a break (#5216), from the stop of the
 * work to the start of the break, or the stop of a run at its last heartbeat (#5123). A start asked meanwhile, by the
 * other timer, a task card or a shortcut, waits for it or is refused as during any start, so the command and the start
 * never land over each other and end one another. It resolves 'blocked', as no work starts. Null, with nothing run,
 * while another start is already in flight.
 */
export function startUnderTimerGuard(run: () => Promise<unknown>): Promise<TimerStartOutcome> | null {
	if (pendingStart) return null;
	const request: Promise<TimerStartOutcome> = trackTimerCommand(run())
		.then(() => 'blocked' as const)
		.finally(() => releaseStartGuard(request));
	holdStartGuard(request, null);
	return request;
}
