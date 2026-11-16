import { ApiError } from '~lib/api-client';
import { createCoalescedRunner } from '~lib/coalesce';
import { withDeadline } from '~lib/deadline';
import { getTimerStatus, sendHeartbeat, type TimerStatus } from '~lib/gauzy';
import { isOwnPagePort } from '~lib/ports';
import { sendsHeartbeat } from '~lib/run-policy';
import { createStatusOrder } from '~lib/status-order';
import { loadSession, takeSessionOut } from '~lib/session-store';
import { badgeText, secondsSince } from '~lib/time-format';
import { isSamePerson, isSameSignIn, type Session } from '~lib/workspaces';
import browser from '~misc/browser';
import { MessageTypesFromBackgroundEnum, MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';

// The badge shows hours and minutes, so a read of the API each minute keeps it right without polling every second.
// The same minute is the heartbeat that credits a run started here, as the web credits its own each minute.
const REFRESH_ALARM = 'refresh-timer-status';
const REFRESH_EVERY_MINUTES = 1;
// The primary color of the web's timer button
const BADGE_COLOR = '#6366f1';
// A call to the API with no answer by then is cancelled: the refreshes go one at a time, and it would hold them all
const CALL_DEADLINE_MS = 30_000;

const ports = new Set<chrome.runtime.Port>();

// The background's reads and the popup's reports in one order: an answer older than what the popup reported is dropped
const statusOrder = createStatusOrder();

function broadcast(status: TimerStatus | null): void {
	const message: IPostMessage<TimerStatus | null> = {
		type: MessageTypesFromBackgroundEnum.statusUpdate,
		payload: status
	};
	for (const port of ports) {
		try {
			port.postMessage(message);
		} catch {
			// A popup closed while the status was on its way: its port is gone, and the other popups still hear it
			ports.delete(port);
		}
	}
}

/**
 * Shows a status on the badge while `isCurrent` says it is still the newest. Checked first, before the badge is
 * touched: a status a sign-out (or a newer status) came before sets neither the color nor the text. The color and the
 * text calls are then issued together, right after the check with no await between: no other code (a sign-out's clear
 * included) can issue a badge call between the check and either of them. The browser runs them asynchronously, in the
 * order they were issued, so a sign-out told meanwhile clears after both; and the end state is the same whichever of
 * the two answers first: the clear empties the text, and the color shows only behind a text.
 */
async function showBadge(status: TimerStatus | null, isCurrent: () => boolean = () => true): Promise<void> {
	if (!isCurrent()) {
		return;
	}
	const run = status?.lastLog;
	const isRunning = Boolean(status?.running && run);
	if (!isRunning || !run) {
		await browser.action.setBadgeText({ text: '' });
		return;
	}
	await Promise.all([
		browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR }),
		browser.action.setBadgeText({ text: badgeText(secondsSince(run.startedAt, Date.now())) })
	]);
}

/**
 * Signed out: the badge clears and an open popup hears it at once. Every read still out was made for the session that
 * ended: its answer must not bring the badge back, nor credit a heartbeat. One sign-out reaches here by several paths
 * (a refresh, a requested refresh, the storage listener, a refused call) and each alarm while signed out: the reads
 * end and the popups hear it once, while the badge is cleared each time, so a clear that failed is tried again.
 */
async function showSignedOut(): Promise<void> {
	const ended = statusOrder.sessionEnded();
	if (ended) {
		broadcast(null);
	}
	await showBadge(null);
}

/**
 * The HTTP status the API answered a failed call with; 0 when it could not be reached (a cancelled call included).
 * Nothing else carries one: a deadline that ended the wait for the session lock rejects with a `TimeoutError`, which
 * has no status, so it can never pass for a 401.
 */
function statusOf(error: unknown): number | undefined {
	if (error instanceof ApiError) {
		return error.status;
	}
	return undefined;
}

/**
 * A 401 the token renewal did not cure: the person was signed out elsewhere, and this browser follows. Only the API's
 * own 401 signs out: a call cut at its deadline or that could not reach the API keeps the person signed in.
 */
async function signOutIfRefused(session: Session, error: unknown): Promise<void> {
	if (statusOf(error) !== 401) {
		return;
	}
	// A sign-in made while this call was out is not the one that failed, and stays
	const signedOut = await takeSessionOut((stored) => isSameSignIn(stored, session));
	if (signedOut) {
		await showSignedOut();
	}
}

/** Credits the minute of a run started here; a run started by another app is left to that app. */
async function creditOwnRun(session: Session, status: TimerStatus): Promise<void> {
	const run = status.lastLog;
	const isOwnRun = Boolean(status.running && run && sendsHeartbeat(run));
	if (!isOwnRun || !run) {
		return;
	}
	try {
		await withDeadline(CALL_DEADLINE_MS, (signal) => sendHeartbeat(session, run, { signal }));
	} catch (error) {
		// The run goes on and the badge shows it: only this minute is not credited yet, and the next heartbeat credits
		// the time since the last one that landed. Told apart from a failed read, which keeps the badge silently.
		console.warn(
			`Ever Teams: the heartbeat of run ${run.id} failed (status ${statusOf(error) ?? 'unknown'}); the next one credits its time.`
		);
		await signOutIfRefused(session, error);
	}
}

/**
 * Reads the timer of the signed-in person and shows it on the toolbar badge; nothing when signed out or stopped.
 * With `heartbeat`, also credits the running time of a run started here.
 */
async function refresh(heartbeat: boolean): Promise<void> {
	const session = await loadSession();
	if (!session) {
		await showSignedOut();
		return;
	}
	const ticket = statusOrder.readSent();
	const isCurrent = () => statusOrder.isLatest(ticket);
	let status: TimerStatus;
	try {
		status = await withDeadline(CALL_DEADLINE_MS, (signal) => getTimerStatus(session, { signal }));
	} catch (error) {
		await signOutIfRefused(session, error);
		// Offline or a server error: the badge keeps its last value, and the next heartbeat credits the missed time
		return;
	}
	// A newer read, a status the popup reported after a start or a stop, or a sign-out came first: this answer is older
	if (!isCurrent()) {
		return;
	}
	await showBadge(status, isCurrent);
	// Checked again: after a sign-out while the badge was set, this answer is neither told to the popups nor credited
	if (!isCurrent()) {
		return;
	}
	broadcast(status);
	if (heartbeat) {
		await creditOwnRun(session, status);
	}
}

/** The storage or the badge failed (not the API, whose failures a refresh handles): the next alarm tries again. */
function reportRefreshFailure(error: unknown): void {
	console.warn('Ever Teams: the timer badge could not be refreshed.', error);
}

/**
 * One refresh at a time, its heartbeat included: an alarm while a read (or its heartbeat) is on its way waits for it,
 * and the refreshes asked for meanwhile run once after it, with a heartbeat when one of them asked for it. Two
 * heartbeats on their way at once would credit the same seconds twice: both read the run's last heartbeat before
 * either landed. The runner ends a failed run silently, so a refresh reports its own failure.
 */
const refreshOneAtATime = createCoalescedRunner(
	(heartbeat: boolean) => refresh(heartbeat).catch(reportRefreshFailure),
	(waiting: boolean, next: boolean) => waiting || next
);

async function requestRefresh(heartbeat = false): Promise<void> {
	try {
		// Nothing to read when signed out: the badge clears at once, even while a read of the ended session is out
		if (!(await loadSession())) {
			await showSignedOut();
			return;
		}
		await refreshOneAtATime(heartbeat);
	} catch (error) {
		reportRefreshFailure(error);
	}
}

function scheduleRefresh(): void {
	browser.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_EVERY_MINUTES });
	void requestRefresh();
}

browser.runtime.onInstalled.addListener(scheduleRefresh);
browser.runtime.onStartup.addListener(scheduleRefresh);

browser.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === REFRESH_ALARM) {
		void requestRefresh(true);
	}
});

// A sign-in, a sign-out or another active team: the badge follows at once instead of at the next minute
browser.storage.onChanged.addListener((changes, area) => {
	const sessionChanged = area === 'local' && 'session' in changes;
	if (!sessionChanged) {
		return;
	}
	const before = changes.session.oldValue as Session | undefined;
	const after = changes.session.newValue as Session | undefined;
	// Another person or API now: the session before ended, as at a sign-out. Its badge and status go at once, whatever
	// the new person's first read answers, and a read still out for it is dropped. A renewed token or another team is
	// the same person, whose read stays good (and keeps its heartbeat); a sign-out is handled by requestRefresh.
	const isAnotherPerson = Boolean(before && after && !isSamePerson(before, after));
	if (isAnotherPerson) {
		void showSignedOut().catch(reportRefreshFailure);
	}
	void requestRefresh();
});

// The popup read the timer (after a start or a stop, or a run stopped elsewhere): the badge shows what it shows
browser.runtime.onConnect.addListener((port) => {
	// A port a web page opened (a content script names its tab) neither sets the badge nor hears the timer
	if (!isOwnPagePort(port)) {
		port.disconnect();
		return;
	}
	ports.add(port);
	port.onDisconnect.addListener(() => ports.delete(port));
	port.onMessage.addListener((message: IPostMessage<TimerStatus>) => {
		const isStatusRead = message.type === MessageTypesToBackgroundEnum.statusRead && message.payload;
		if (isStatusRead) {
			const ticket = statusOrder.reported();
			void showBadge(message.payload ?? null, () => statusOrder.isLatest(ticket));
		}
	});
});

export {};
