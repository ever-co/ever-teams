/** Writes seconds of the running timer to the API: rejects when the API did not answer that it wrote them. */
export type WriteRunningSeconds = (seconds: number) => Promise<void>;

/**
 * Another writer of the running time, which the start and the stop of the current screens tell. Builds of the new app
 * (EXPO_PUBLIC_APP_SHELL=next) register the new heartbeat (src/home/next-shell-heartbeat.tsx), which writes the running
 * time there in place of the current screens' five-second write. The app people install registers none: nothing
 * changes for it.
 */
export interface RunningTimeWriter {
	/** Before a stop is sent: writes the time of that run since its own last write, once, and never fails the stop. */
	beforeStop(run: { id?: string; startedAt?: string } | undefined, write: WriteRunningSeconds): Promise<void>;
	/** After a start or a stop the API answered: reads the timer again, to follow the run or to let go of it. */
	afterChange(): void;
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
