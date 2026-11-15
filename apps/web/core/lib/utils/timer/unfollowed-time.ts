import { STALE_TIMER_THRESHOLD, SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { isRunningTeamsLog, isStaleTeamsTimer } from '@/core/lib/helpers/timer-policy';
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
 */

/**
 * Below this, nothing is asked: heartbeats are a minute apart, and a browser sends those of a tab in the background
 * late.
 */
export const UNFOLLOWED_TIME_FLOOR_MS = 3 * SYNC_TIMER_INTERVAL;

const LAST_HEARTBEAT_KEY = 'ever-teams.timer.last-heartbeat';
const ANSWER_KEY = 'ever-teams.timer.unfollowed-time-answer';

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

/** Keeps the heartbeat the API has just taken for a running web timer. */
export function rememberHeartbeat(lastLog: ITimeLog | null | undefined, at: number = Date.now()): void {
	if (!isRunningTeamsLog(lastLog) || !lastLog.id || !lastLog.stoppedAt) {
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
 * How a question ends: the person keeps the time (`keep`) or stops the run at its last heartbeat (`stop`); they
 * answered in another tab, which acts on it (`elsewhere`); or they did not answer before the closed-tab delay was
 * reached (`expired`), and the run is stopped at its last heartbeat as that rule has it.
 */
export type UnfollowedTimeAnswer = 'keep' | 'stop' | 'elsewhere' | 'expired';

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

/** Another tab answered the question about this run: this tab's question goes, and nothing is done here. */
function onAnswerElsewhere(event: StorageEvent): void {
	if (event.key !== ANSWER_KEY || !event.newValue || !question) {
		return;
	}
	try {
		const answered = JSON.parse(event.newValue) as { timeLogId?: unknown } | null;
		if (answered?.timeLogId === question.timeLogId) {
			endQuestion('elsewhere');
		}
	} catch {
		// Not an answer
	}
}

function endQuestion(answer: UnfollowedTimeAnswer): void {
	const settle = settleQuestion;
	settleQuestion = null;
	if (typeof window !== 'undefined') {
		window.removeEventListener('storage', onAnswerElsewhere);
	}
	showQuestion(null);
	settle?.(answer);
}

/**
 * Asks the person what becomes of the time since the run's last heartbeat. One question at a time: a question asked
 * while another waits ends that one as answered elsewhere.
 *
 * @param expiresInMs How long the person has to answer: until the closed-tab delay is reached.
 * @returns How the question ended.
 */
export function askAboutUnfollowedTime(
	asked: UnfollowedTimeQuestion,
	expiresInMs: number
): Promise<UnfollowedTimeAnswer> {
	if (settleQuestion) {
		endQuestion('elsewhere');
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
			window.addEventListener('storage', onAnswerElsewhere);
		}
		showQuestion(asked);
	});
}

/** The person's answer, in this tab. The other tabs of the browser drop their question about the same run. */
export function answerUnfollowedTime(answer: 'keep' | 'stop'): void {
	if (!question) {
		return;
	}
	try {
		browserStorage()?.setItem(ANSWER_KEY, JSON.stringify({ timeLogId: question.timeLogId, at: Date.now() }));
	} catch {
		// The other tabs keep their question: each answer is checked against the run before it is applied
	}
	endQuestion(answer);
}

/** The question goes without an answer: the person signed out, or the run is no longer theirs to settle here. */
export function dropUnfollowedTimeQuestion(): void {
	if (settleQuestion) {
		endQuestion('elsewhere');
	}
}
