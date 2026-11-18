/** How often a running timer tells the API it goes on, as the web does. */
export const HEARTBEAT_MS = 60_000;

// Gauzy merges time slots into 10-minute windows and caps each merged slot at 600 seconds
const MAX_SLOT_SECONDS = 600;
const DEFAULT_SLOT_SECONDS = HEARTBEAT_MS / 1000;

/**
 * The seconds a heartbeat credits: the time since the previous one of the same run, or one interval when there was
 * none yet, never more than one 10-minute slot holds.
 */
export function slotSeconds(previousAt: number | null, now: number): number {
	if (previousAt === null) {
		return DEFAULT_SLOT_SECONDS;
	}
	const elapsed = Math.round((now - previousAt) / 1000);
	return Math.min(MAX_SLOT_SECONDS, Math.max(0, elapsed));
}

/** Writes seconds of the running timer to the API: rejects when the API did not answer that it wrote them. */
export type WriteSeconds = (seconds: number) => Promise<void>;

/** The run whose time is written, and up to when the API answered that it wrote it. */
interface Cursor {
	runId: string;
	writtenUntil: number;
}

// One for the app, as on the web's timer service: the minute's heartbeat and a stop write the same run's time
let cursor: Cursor | null = null;
let writing: Promise<void> | null = null;

/** How the heartbeat and a stop name a run: its log's id, or its start for an API that sends no id. */
export function runIdOf(log: { id?: string; startedAt?: string } | undefined): string {
	return log?.id ?? log?.startedAt ?? '';
}

/** The app sees a run going: its time is written from now on, or, for the run already followed, from where it was. */
export function followRun(runId: string, now: number): void {
	if (cursor?.runId !== runId) {
		cursor = { runId, writtenUntil: now };
	}
}

/**
 * No run goes anymore: nothing more is written. Given a run, only that run is let go of: a stop answered late leaves
 * a run followed since alone.
 */
export function forgetRun(runId?: string): void {
	if (runId !== undefined && cursor?.runId !== runId) {
		return;
	}
	cursor = null;
}

async function writeSince(write: WriteSeconds, now: number): Promise<void> {
	const run = cursor;
	if (!run) {
		return;
	}
	const seconds = slotSeconds(run.writtenUntil, now);
	if (seconds <= 0) {
		return;
	}
	await write(seconds);
	// Moved once the API answered only: a write that failed is covered by the next one
	if (cursor === run) {
		run.writtenUntil = now;
	}
}

/**
 * Writes the time since the last write the API answered. One write at a time: while one is on its way, this one is
 * left out, and the next covers its time too, so a slow write can neither lose nor repeat a minute.
 */
export function writeRunTime(write: WriteSeconds, now: number = Date.now()): Promise<void> {
	if (writing) {
		return writing;
	}
	const current = writeSince(write, now).finally(() => {
		writing = null;
	});
	writing = current;
	return current;
}

/**
 * Before a stop: the time since the last write, once a write on its way has finished, so the run's last minute, or a
 * run shorter than one, is not left without a time slot. Only for the run the stop is for.
 */
export async function writeRunTimeBeforeStop(write: WriteSeconds, runId: string): Promise<void> {
	if (writing) {
		await writing.catch(() => undefined);
	}
	if (cursor?.runId !== runId) {
		return;
	}
	await writeRunTime(write, Date.now());
}
