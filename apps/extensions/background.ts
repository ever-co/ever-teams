import { getTimerStatus, sendHeartbeat, type TimerStatus } from '~lib/gauzy';
import { isOwnPagePort } from '~lib/ports';
import { sendsHeartbeat } from '~lib/run-policy';
import { createStatusOrder } from '~lib/status-order';
import { loadSession, takeSessionOut } from '~lib/session-store';
import { badgeText, secondsSince } from '~lib/time-format';
import { isSameSignIn, type Session } from '~lib/workspaces';
import browser from '~misc/browser';
import { MessageTypesFromBackgroundEnum, MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';

// The badge shows hours and minutes, so a read of the API each minute keeps it right without polling every second.
// The same minute is the heartbeat that credits a run started here, as the web credits its own each minute.
const REFRESH_ALARM = 'refresh-timer-status';
const REFRESH_EVERY_MINUTES = 1;
// The primary color of the web's timer button
const BADGE_COLOR = '#6366f1';

const ports = new Set<chrome.runtime.Port>();

// The background's reads and the popup's reports in one order: an answer older than what the popup reported is dropped
const statusOrder = createStatusOrder();

function broadcast(status: TimerStatus | null): void {
	const message: IPostMessage<TimerStatus | null> = {
		type: MessageTypesFromBackgroundEnum.statusUpdate,
		payload: status
	};
	for (const port of ports) {
		port.postMessage(message);
	}
}

async function showBadge(status: TimerStatus | null): Promise<void> {
	const run = status?.lastLog;
	const isRunning = Boolean(status?.running && run);
	if (!isRunning || !run) {
		await browser.action.setBadgeText({ text: '' });
		return;
	}
	await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
	await browser.action.setBadgeText({ text: badgeText(secondsSince(run.startedAt, Date.now())) });
}

/** Credits the minute of a run started here; a run started by another app is left to that app. */
async function creditOwnRun(session: Session, status: TimerStatus): Promise<void> {
	const run = status.lastLog;
	const isOwnRun = Boolean(status.running && run && sendsHeartbeat(run));
	if (!isOwnRun || !run) {
		return;
	}
	await sendHeartbeat(session, run);
}

/**
 * Reads the timer of the signed-in person and shows it on the toolbar badge; nothing when signed out or stopped.
 * With `heartbeat`, also credits the running time of a run started here.
 */
async function refresh(heartbeat = false): Promise<void> {
	const session = await loadSession();
	if (!session) {
		await showBadge(null);
		broadcast(null);
		return;
	}
	const ticket = statusOrder.readSent();
	try {
		const status = await getTimerStatus(session);
		// A newer read, or a status the popup reported after a start or a stop, came first: this answer is older
		if (!statusOrder.isLatest(ticket)) {
			return;
		}
		await showBadge(status);
		broadcast(status);
		if (heartbeat) {
			await creditOwnRun(session, status);
		}
	} catch (error) {
		const isSignedOutElsewhere = (error as { status?: number }).status === 401;
		// A sign-in made while this read was out is not the one that failed, and stays
		const signedOut = isSignedOutElsewhere && (await takeSessionOut((stored) => isSameSignIn(stored, session)));
		if (signedOut) {
			await showBadge(null);
			broadcast(null);
		}
		// Offline or a server error: the badge keeps its last value, and the next heartbeat credits the missed time
	}
}

function scheduleRefresh(): void {
	browser.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_EVERY_MINUTES });
	void refresh();
}

browser.runtime.onInstalled.addListener(scheduleRefresh);
browser.runtime.onStartup.addListener(scheduleRefresh);

browser.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === REFRESH_ALARM) {
		void refresh(true);
	}
});

// A sign-in, a sign-out or another active team: the badge follows at once instead of at the next minute
browser.storage.onChanged.addListener((changes, area) => {
	const sessionChanged = area === 'local' && 'session' in changes;
	if (sessionChanged) {
		void refresh();
	}
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
			statusOrder.reported();
			void showBadge(message.payload ?? null);
		}
	});
});

export {};
