/** Writes seconds of the running timer to the API: rejects when the API did not answer that it wrote them. */
export type WriteRunningSeconds = (seconds: number) => Promise<void>;

/** A run of the timer, as the API names it: its log. */
export type TimerRun = { id?: string; startedAt?: string };

/**
 * Another writer of the running time, which the start and the stop of the current screens tell. Builds of the new app
 * (EXPO_PUBLIC_APP_SHELL=next) register the new heartbeat (src/home/next-shell-heartbeat.tsx), which writes the running
 * time there in place of the current screens' five-second write. The app people install registers none: nothing
 * changes for it.
 */
export interface RunningTimeWriter {
	/** After a start the API answered: follows that run from now on, and reads the timer again. */
	afterStart(run: TimerRun): void;
	/** Before a stop is sent: writes the time of that run since its own last write, once, and never fails the stop. */
	beforeStop(run: TimerRun | undefined, write: WriteRunningSeconds): Promise<void>;
	/**
	 * After a stop, whether the API stopped the timer or not: lets go of the run it stopped, if any, and reads the timer
	 * again.
	 */
	afterStop(stoppedRun: TimerRun | undefined): void;
}

let registered: RunningTimeWriter | null = null;

/**
 * Registers the other writer of the running time.
 *
 * @returns The function that withdraws it.
 */
export function registerRunningTimeWriter(writer: RunningTimeWriter): () => void {
	registered = writer;
	return () => {
		if (registered === writer) {
			registered = null;
		}
	};
}

/** The other writer of the running time, if one is registered. */
export function runningTimeWriter(): RunningTimeWriter | null {
	return registered;
}
