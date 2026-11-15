import { STALE_TIMER_THRESHOLD, SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { isRunningTeamsLog, isStaleTeamsTimer } from '@/core/lib/helpers/timer-policy';
import { isBreakLog } from '@/core/lib/utils/timer/timer-break';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * Time a web timer ran while the app could not follow it (#5123): the tab was closed, the computer slept, the browser
 * paused the tab. Each heartbeat moves the end of the run to the present, so the time up to the last heartbeat is
 * counted, and what comes after it is counted only once a heartbeat is sent again.
 *
 * - Up to three minutes without a heartbeat is the app's ordinary pace: nothing is asked.
 * - Past the closed-tab delay (NEXT_PUBLIC_STALE_TIMER_THRESHOLD_MINUTES, 10 by default), the run is stopped at its
 *   last heartbeat and the person is told, as before.
 * - In between, the person is asked whether to keep that time or to stop the run at its last heartbeat. It used to be
 *   kept without a word, and a tab that woke up after a sleep kept it however long the sleep had been.
 *
 * A break is never asked about: it is time away from work, never counted (timer-break.ts), and no heartbeat goes during
 * one. Time the page followed while offline is not time without the app: the page ran, and the heartbeats it sends
 * again once online keep it, as before.
 */

/**
 * Below this, nothing is asked: heartbeats are a minute apart, and a browser sends those of a tab in the background
 * late.
 */
export const UNFOLLOWED_TIME_FLOOR_MS = 3 * SYNC_TIMER_INTERVAL;

const LAST_HEARTBEAT_KEY = 'ever-teams.timer.last-heartbeat';
const SETTLED_KEY = 'ever-teams.timer.unfollowed-time-settled';
const LOCK_NAME = 'ever-teams.timer.unfollowed-time';

/**
 * The last heartbeat a tab of this browser sent, kept in the storage its tabs share. The time since then is counted
 * on the computer's clock alone, which the API's clock need not agree with.
 */
interface RememberedHeartbeat {
	/** The run it was sent for. */
	timeLogId: string;
	/** When it was sent, on the computer's clock. */
	at: number;
	/** The end the API gave the run for it, on the API's clock. */
	stoppedAt: string;
}

/** The browser's storage, or null where there is none (the server's render) or the browser blocks it. */
function browserStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}

/** Keeps the heartbeat the API has just taken for a running web timer (never a break's). */
export function rememberHeartbeat(lastLog: ITimeLog | null | undefined, at: number = Date.now()): void {
	if (!isRunningTeamsLog(lastLog) || isBreakLog(lastLog) || !lastLog.id || !lastLog.stoppedAt) {
		return;
	}
	const stoppedAt = new Date(lastLog.stoppedAt);
	if (Number.isNaN(stoppedAt.getTime())) {
		return;
	}
	const heartbeat: RememberedHeartbeat = { timeLogId: lastLog.id, at, stoppedAt: stoppedAt.toISOString() };
	try {
		browserStorage()?.setItem(LAST_HEARTBEAT_KEY, JSON.stringify(heartbeat));
	} catch {
		// A full or blocked storage: the time without the app is then counted on the API's clock
	}
}

/** The heartbeat this browser last sent, or null when it kept none that can be read. */
export function rememberedHeartbeat(): RememberedHeartbeat | null {
	try {
		const stored = browserStorage()?.getItem(LAST_HEARTBEAT_KEY);
		const heartbeat = stored ? (JSON.parse(stored) as Partial<RememberedHeartbeat> | null) : null;
		const isHeartbeat =
			typeof heartbeat?.timeLogId === 'string' &&
			!!heartbeat.timeLogId &&
			typeof heartbeat.at === 'number' &&
			Number.isFinite(heartbeat.at) &&
			typeof heartbeat.stoppedAt === 'string' &&
			!Number.isNaN(Date.parse(heartbeat.stoppedAt));
		return isHeartbeat ? (heartbeat as RememberedHeartbeat) : null;
	} catch {
		return null;
	}
}

/** Forgets the heartbeat: the person signed out. */
export function forgetHeartbeat(): void {
	try {
		browserStorage()?.removeItem(LAST_HEARTBEAT_KEY);
	} catch {
		// Nothing to remove from a storage that cannot be reached
	}
}

/**
 * What becomes of the time a run went on without a heartbeat:
 * - `follow`: the app carries on with the run, and that time is in it;
 * - `ask`: the person says whether to keep it;
 * - `stop`: the run is stopped at its last heartbeat.
 */
type UnfollowedTimeDecision = 'follow' | 'ask' | 'stop';

interface UnfollowedTimeFacts {
	/** The employee's last log, as the API has it. */
	lastLog: ITimeLog | null | undefined;
	/**
	 * The present the closed-tab rule goes by: the API's clock when its answer gives it, else the computer's less the
	 * minutes it may run fast.
	 */
	now: number;
	/** The present on the computer's clock. */
	clientNow: number;
	/** The last heartbeat this browser sent. */
	remembered?: RememberedHeartbeat | null;
	thresholdMs?: number;
	floorMs?: number;
}

/**
 * Decides what becomes of the time since a run's last heartbeat.
 *
 * The closed-tab rule itself is unchanged (isStaleTeamsTimer). Below it, the time without a heartbeat is the time
 * since this browser sent the run's last heartbeat, when it was the one that sent it: both ends are on the computer's
 * clock. Otherwise it is counted from the heartbeat the API has, as the rule counts it.
 */
export function decideUnfollowedTime({
	lastLog,
	now,
	clientNow,
	remembered = null,
	thresholdMs = STALE_TIMER_THRESHOLD.value,
	floorMs = UNFOLLOWED_TIME_FLOOR_MS
}: UnfollowedTimeFacts): UnfollowedTimeDecision {
	// The closed-tab rule is off: every run goes on, as before
	if (!thresholdMs || thresholdMs <= 0) return 'follow';
	if (!isRunningTeamsLog(lastLog) || !lastLog.stoppedAt || !lastLog.startedAt) return 'follow';
	// A break is never counted: there is no time of it to keep, nor a run to stop at its last heartbeat
	if (isBreakLog(lastLog)) return 'follow';
	const heartbeat = new Date(lastLog.stoppedAt).getTime();
	// No heartbeat yet: the run's age proves nothing (see isStaleTeamsTimer)
	if (Number.isNaN(heartbeat) || heartbeat <= new Date(lastLog.startedAt).getTime()) return 'follow';

	const isOwnHeartbeat =
		!!remembered && remembered.timeLogId === lastLog.id && Date.parse(remembered.stoppedAt) === heartbeat;
	const unfollowedFor = isOwnHeartbeat ? clientNow - remembered.at : now - heartbeat;
	// A delay set shorter than the floor leaves nothing to ask about
	if (unfollowedFor <= Math.min(floorMs, thresholdMs)) return 'follow';
	return isStaleTeamsTimer(lastLog, now, thresholdMs) ? 'stop' : 'ask';
}

/** The question put to the person: a run went on from `from` without the app following it. */
export interface UnfollowedTimeQuestion {
	employeeId: string;
	timeLogId: string;
	/** The run's last heartbeat: the time up to it is counted whatever the answer. */
	from: string;
	/** When the question was asked, on the computer's clock. */
	until: number;
}

/**
 * How a question ends: the person keeps the time (`keep`) or stops the run at its last heartbeat (`stop`); another
 * tab settled that time and says so (`elsewhere`), so this one reads the run again; they did not answer before the
 * closed-tab delay was reached (`expired`), and the run is stopped at its last heartbeat as that rule has it; the page
 * was hidden (`hidden`), and the question is put again once it shows; or it went without an answer (`dropped`): the
 * person signed out, or another question took its place.
 */
export type UnfollowedTimeAnswer = 'keep' | 'stop' | 'elsewhere' | 'expired' | 'hidden' | 'dropped';

let question: UnfollowedTimeQuestion | null = null;
let settleQuestion: ((answer: UnfollowedTimeAnswer) => void) | null = null;
const questionListeners = new Set<() => void>();

function showQuestion(next: UnfollowedTimeQuestion | null): void {
	question = next;
	for (const listener of [...questionListeners]) listener();
}

/** For useSyncExternalStore: the question on screen changed. */
export function subscribeToUnfollowedTimeQuestion(listener: () => void): () => void {
	questionListeners.add(listener);
	return () => {
		questionListeners.delete(listener);
	};
}

/** The question waiting for the person's answer in this tab, or null. */
export function unfollowedTimeQuestion(): UnfollowedTimeQuestion | null {
	return question;
}

/** Whether the person cannot see the page: another tab is in front, or the window is minimized. */
function isPageHidden(): boolean {
	return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/** Another tab settled the time about this run: this tab's question goes, and the run is read again. */
function onSettledElsewhere(event: StorageEvent): void {
	if (event.key !== SETTLED_KEY || !event.newValue || !question) {
		return;
	}
	try {
		const settled = JSON.parse(event.newValue) as { timeLogId?: unknown } | null;
		if (settled?.timeLogId === question.timeLogId) {
			endQuestion('elsewhere');
		}
	} catch {
		// Not an announcement
	}
}

/** The person left the page for another tab: the question goes, to be put again where they are. */
function onVisibilityChange(): void {
	if (isPageHidden()) {
		endQuestion('hidden');
	}
}

function endQuestion(answer: UnfollowedTimeAnswer): void {
	const settle = settleQuestion;
	settleQuestion = null;
	if (typeof window !== 'undefined') {
		window.removeEventListener('storage', onSettledElsewhere);
		document.removeEventListener('visibilitychange', onVisibilityChange);
	}
	showQuestion(null);
	settle?.(answer);
}

/**
 * Asks the person what becomes of the time since the run's last heartbeat. One question at a time: a question asked
 * while another waits drops that one. A page the person cannot see asks nothing: it ends `hidden` at once, and when it
 * is hidden while the question waits.
 *
 * @param expiresInMs How long the person has to answer: until the closed-tab delay is reached.
 * @returns How the question ended.
 */
export function askAboutUnfollowedTime(
	asked: UnfollowedTimeQuestion,
	expiresInMs: number
): Promise<UnfollowedTimeAnswer> {
	if (settleQuestion) {
		endQuestion('dropped');
	}
	if (isPageHidden()) {
		return Promise.resolve('hidden');
	}
	return new Promise<UnfollowedTimeAnswer>((resolve) => {
		const expiry = setTimeout(
			() => {
				if (question === asked) endQuestion('expired');
			},
			Math.max(0, expiresInMs)
		);
		settleQuestion = (answer) => {
			clearTimeout(expiry);
			resolve(answer);
		};
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', onSettledElsewhere);
			document.addEventListener('visibilitychange', onVisibilityChange);
		}
		showQuestion(asked);
	});
}

/**
 * The person's answer, in this tab. The other tabs hear of it once it is applied (announceUnfollowedTimeSettled):
 * told before, one of them would send a stop that waited, at the present, ahead of the stop at the last heartbeat.
 */
export function answerUnfollowedTime(answer: 'keep' | 'stop'): void {
	if (!question) {
		return;
	}
	endQuestion(answer);
}

/** The time without the app a tab settled last, as the other tabs read it. */
interface SettledTime {
	timeLogId: string;
	/** The run's last heartbeat, from which the time went without the app. */
	from: string;
	/** Whether the person kept that time, or the run was stopped at `from`. */
	kept: boolean;
	/** When it was settled, on the computer's clock. */
	at: number;
}

/**
 * Tells the other tabs of the browser that the time of this run since `from` is settled: a question they put about it
 * goes, and they read the run again.
 */
export function announceUnfollowedTimeSettled(timeLogId: string, from: string, kept: boolean): void {
	const settled: SettledTime = { timeLogId, from, kept, at: Date.now() };
	try {
		browserStorage()?.setItem(SETTLED_KEY, JSON.stringify(settled));
	} catch {
		// Their question then stays until it is answered or expires: each answer is checked against the run first
	}
}

/**
 * Whether a tab of this browser kept, moments ago, the time this run went without the app since `from`. Its heartbeat
 * may have failed, so the run still reads as it was: the answer stands, and the person is not asked again. The time
 * after that is asked about as any other once more than the floor of it went by.
 */
export function isUnfollowedTimeKept(timeLogId: string, from: string, now: number = Date.now()): boolean {
	try {
		const stored = browserStorage()?.getItem(SETTLED_KEY);
		const settled = stored ? (JSON.parse(stored) as Partial<SettledTime> | null) : null;
		return (
			settled?.kept === true &&
			settled.timeLogId === timeLogId &&
			settled.from === from &&
			typeof settled.at === 'number' &&
			now - settled.at <= UNFOLLOWED_TIME_FLOOR_MS
		);
	} catch {
		return false;
	}
}

/** The question goes without an answer: the person signed out, or the run is no longer theirs to settle here. */
export function dropUnfollowedTimeQuestion(): void {
	if (settleQuestion) {
		endQuestion('dropped');
	}
}

/** Resolves once the person can see the page: only such a page asks. */
export function whenPageShows(): Promise<void> {
	if (!isPageHidden()) {
		return Promise.resolve();
	}
	return new Promise<void>((resolve) => {
		const onShown = () => {
			if (isPageHidden()) return;
			document.removeEventListener('visibilitychange', onShown);
			resolve();
		};
		document.addEventListener('visibilitychange', onShown);
	});
}

/**
 * Runs `settle` in one tab of this browser at a time (Web Locks), so only one tab asks: the others wait, then read the
 * run again and find its time settled. A browser without Web Locks (an insecure context) runs it at once, and the
 * question of every tab that put one goes when one of them settles that time (announceUnfollowedTimeSettled).
 */
export function inOneTabAtATime<T>(settle: () => Promise<T>): Promise<T> {
	const locks = typeof navigator === 'undefined' ? undefined : (navigator.locks as LockManager | undefined);
	if (!locks) {
		return settle();
	}
	// The lock is held until what `settle` returns is settled
	return locks.request(LOCK_NAME, settle).then((settled) => settled);
}
