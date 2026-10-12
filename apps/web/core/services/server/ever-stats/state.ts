/**
 * What the statistics reporter of this process did, shared between the scheduler (started from
 * instrumentation.ts) and the /api/ever-stats routes. Next.js evaluates those in separate bundles,
 * so the state lives on `globalThis` under one symbol rather than in a module variable. Memory only:
 * nothing is written to disk or to any store.
 */

/** One delivery attempt, as the operator's "last payload" view shows it. */
export interface StatsAttemptRecord {
	/** The exact bytes that were signed and sent (UTF-8). */
	readonly payload: string;
	/** When the attempt was made (ISO 8601, UTC). */
	readonly sent_at: string;
	/** The HTTP status of the answer, or `null` when none arrived. */
	readonly http_status: number | null;
	readonly outcome: 'sent' | 'rejected' | 'failed';
	readonly period: string;
	readonly final: boolean;
}

export type ReporterStatus =
	| 'starting'
	| 'running'
	| 'paused_by_api'
	| 'off_key_missing'
	| 'off_key_invalid'
	| 'off_api_url'
	| 'off_api_unconfigured'
	| 'off_key_mismatch';

export interface ReporterState {
	status: ReporterStatus;
	nextSendAt: Date | null;
	/** The last 12 attempts, newest first. */
	attempts: StatsAttemptRecord[];
}

export const MAX_KEPT_ATTEMPTS = 12;

const STATE_KEY = Symbol.for('ever-teams.ever-stats.reporter-state');

type WithReporterState = typeof globalThis & { [STATE_KEY]?: ReporterState };

/** The reporter state of this process (created on first use). */
export function reporterState(): ReporterState {
	const holder = globalThis as WithReporterState;
	holder[STATE_KEY] ??= { status: 'starting', nextSendAt: null, attempts: [] };
	return holder[STATE_KEY];
}

/** Whether a reporter was started in this process. */
export function hasReporterState(): boolean {
	return (globalThis as WithReporterState)[STATE_KEY] !== undefined;
}

export function recordAttempt(record: StatsAttemptRecord): void {
	const state = reporterState();
	state.attempts = [record, ...state.attempts].slice(0, MAX_KEPT_ATTEMPTS);
}

/** Tests only: forget the state of this process. */
export function resetReporterState(): void {
	delete (globalThis as WithReporterState)[STATE_KEY];
}
