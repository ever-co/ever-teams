import { STATS_RETRY_DELAYS_S } from '@ever-co/connect-sdk';
import {
	readInstallSource,
	readPairedApiUrl,
	readSendIntervalS,
	readStatsApiUrl,
	readStatsCountry
} from '@/core/lib/ever-platform/stats-config';
import { readPairedStatsState, type PairedStatsState } from './gauzy-state';
import { ephemeralIdentity, loadStatsIdentity, type ReadyStatsIdentity } from './instance';
import { logReporterState, logSendOutcome, type SendOutcome } from '../ever-platform/log';
import { buildTeamsReport, previousUtcPeriod } from './report';
import { sendTeamsReport } from './sender';
import { reporterState, type ReporterStatus } from './state';

/**
 * The statistics reporter of this web app process, started once from instrumentation.ts (Node.js
 * runtime only, and only when `EVER_STATS_ENABLED` is not 'false').
 *
 * - First attempt 10 minutes after the start, then once a day at a second drawn at random each day
 *   (never derived from the instance id), UTC.
 * - Before EVERY send it asks the paired API (`GET /ever-stats/state`) and sends nothing unless the
 *   answer is `200 { "enabled": true }`.
 * - On days 1-3 of a month it also sends the closed previous month once (`final: true`).
 * - A failed delivery (no answer, 429, 5xx) is retried after 1 h, 4 h and 12 h, then at the next day's
 *   slot. A refused report is not retried before the next slot. `409 key_mismatch`: a random identity
 *   starts a new series; a configured identity stops the reporter (the operator must fix the key).
 * - Every timer is `unref()`'d: the reporter never keeps the process alive.
 */

type Env = Record<string, string | undefined>;

type Timer = { unref?: () => unknown };

export interface SchedulerDeps {
	env?: Env;
	now?: () => Date;
	fetch?: typeof globalThis.fetch;
	random?: () => number;
	setTimer?: (callback: () => void, delayMs: number) => Timer;
	clearTimer?: (timer: Timer) => void;
}

export interface EverStatsScheduler {
	/** Runs one attempt now (tests). */
	runNow(): Promise<void>;
	stop(): void;
}

export const FIRST_SEND_DELAY_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FINAL_RESEND_LAST_DAY = 3;

const SCHEDULER_KEY = Symbol.for('ever-teams.ever-stats.scheduler');
type WithScheduler = typeof globalThis & { [SCHEDULER_KEY]?: EverStatsScheduler };

const SKIP_OUTCOME: Record<Exclude<PairedStatsState, 'enabled'>, SendOutcome> = {
	disabled: 'skipped_gauzy_off',
	unpaired: 'skipped_gauzy_unpaired',
	unreachable: 'skipped_gauzy_unreachable'
};

function setStatus(status: ReporterStatus): void {
	const state = reporterState();
	if (state.status !== status) logReporterState(status);
	state.status = status;
}

/** Starts the reporter of this process (once; a second call answers the running one, or null when off). */
export function startEverStats(deps: SchedulerDeps = {}): EverStatsScheduler | null {
	const holder = globalThis as WithScheduler;
	if (holder[SCHEDULER_KEY]) return holder[SCHEDULER_KEY];

	const env = deps.env ?? (process.env as Env);
	const now = deps.now ?? (() => new Date());
	const random = deps.random ?? Math.random;
	const setTimer = deps.setTimer ?? ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
	const clearTimer = deps.clearTimer ?? ((timer: Timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
	const state = reporterState();

	const loaded = loadStatsIdentity(env);
	if (loaded.state === 'off') {
		setStatus(loaded.reason === 'stats_key_missing' ? 'off_key_missing' : 'off_key_invalid');
		return null;
	}
	let identity: ReadyStatsIdentity = loaded;
	const configuredStatsApiUrl = readStatsApiUrl(env);
	if (!configuredStatsApiUrl) {
		setStatus('off_api_url');
		return null;
	}
	const configuredPairedApiUrl = readPairedApiUrl(env);
	if (!configuredPairedApiUrl) {
		setStatus('off_api_unconfigured');
		return null;
	}
	const statsApiUrl: string = configuredStatsApiUrl;
	const pairedApiUrl: string = configuredPairedApiUrl;
	const intervalS = readSendIntervalS(statsApiUrl, env);
	const installSource = readInstallSource(env);
	const country = readStatsCountry(env);

	let timer: Timer | null = null;
	let stopped = false;
	let running = false;
	let failures = 0;
	let finalSentFor: string | null = null;
	let lastSkip: SendOutcome | null = null;

	const nextDailySlot = (at: Date): number => {
		if (intervalS) return intervalS * 1000;
		const tomorrow = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
		return tomorrow + Math.floor(random() * DAY_MS) - at.getTime();
	};

	const schedule = (delayMs: number) => {
		if (stopped) return;
		if (timer) clearTimer(timer);
		state.nextSendAt = new Date(now().getTime() + delayMs);
		timer = setTimer(() => void run(), delayMs);
		timer.unref?.();
	};

	const retryDelay = (): number => {
		if (intervalS) return intervalS * 1000;
		const ladder = STATS_RETRY_DELAYS_S.filter((delayS) => delayS * 1000 < DAY_MS);
		return failures <= ladder.length ? ladder[failures - 1] * 1000 : nextDailySlot(now());
	};

	async function run(): Promise<void> {
		if (stopped || running) return;
		running = true;
		try {
			const at = now();
			const paired = await readPairedStatsState(pairedApiUrl, deps.fetch);
			if (paired !== 'enabled') {
				const outcome = SKIP_OUTCOME[paired];
				// One line per change, not one per attempt: an unpaired API stays unpaired.
				if (outcome !== lastSkip) logSendOutcome(outcome, null, false);
				lastSkip = outcome;
				setStatus('paused_by_api');
				failures = 0;
				schedule(nextDailySlot(at));
				return;
			}
			lastSkip = null;
			setStatus('running');

			const finalPeriod = previousUtcPeriod(at);
			const finals = at.getUTCDate() <= FINAL_RESEND_LAST_DAY && finalSentFor !== finalPeriod ? [true] : [];
			for (const final of [false, ...finals]) {
				const report = buildTeamsReport({ now: at, instanceId: identity.instanceId, installSource, country, final });
				const result = await sendTeamsReport(report, identity, {
					baseUrl: statsApiUrl,
					now: at,
					fetch: deps.fetch,
					attempt: failures
				});
				if (result.kind === 'sent') {
					failures = 0;
					if (final) finalSentFor = finalPeriod;
					continue;
				}
				if (result.kind === 'failed') {
					failures += 1;
					schedule(retryDelay());
					return;
				}
				if (result.kind === 'rejected' && result.keyMismatch) {
					if (identity.source === 'ephemeral') {
						// The random id met another key: start a new series with a new id and key.
						identity = ephemeralIdentity();
						break;
					}
					setStatus('off_key_mismatch');
					stop();
					return;
				}
			}
			schedule(nextDailySlot(at));
		} finally {
			running = false;
		}
	}

	function stop(): void {
		stopped = true;
		if (timer) clearTimer(timer);
		timer = null;
		state.nextSendAt = null;
	}

	const scheduler: EverStatsScheduler = { runNow: run, stop };
	holder[SCHEDULER_KEY] = scheduler;
	setStatus('running');
	schedule(intervalS ? intervalS * 1000 : FIRST_SEND_DELAY_MS);
	return scheduler;
}

/** Tests only: stop and forget the reporter of this process. */
export function stopEverStats(): void {
	const holder = globalThis as WithScheduler;
	holder[SCHEDULER_KEY]?.stop();
	delete holder[SCHEDULER_KEY];
}
