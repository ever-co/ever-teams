import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '~lib/api-client';
import { getTimerStatus, type TimerStatus } from '~lib/gauzy';
import { refusalOf, type Refusal } from '~lib/refusal';
import { secondsSince } from '~lib/time-format';
import type { Session } from '~lib/workspaces';
import browser from '~misc/browser';
import { MessageTypesFromBackgroundEnum, MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';

// While the popup is open it reads the API this often, so a run started or stopped elsewhere shows within that time
const POLL_EVERY_MS = 30_000;

function failureOf(error: unknown): Refusal {
	if (error instanceof ApiError) {
		return refusalOf(error);
	}
	return { key: 'errorGeneric' };
}

/** The running clock, and today's total from the last read plus what the run added since that read. */
function countsOf(status: TimerStatus | null, isRunning: boolean, now: number, readAt: number) {
	const today = status?.duration ?? 0;
	const startedAt = status?.lastLog?.startedAt;
	if (!isRunning || !startedAt) {
		return { runSeconds: 0, todaySeconds: today };
	}
	const sinceRead = Math.max(0, Math.floor((now - readAt) / 1000));
	return { runSeconds: secondsSince(startedAt, now), todaySeconds: today + sinceRead };
}

/**
 * The person's timer as the API answers it, read when the popup opens and every 30 seconds, with the running clock
 * ticking each second in between. `notifyBackground` asks the background to read it again for the toolbar badge.
 *
 * A start or a stop the API refused keeps its reason (`refusal`) until the next action: the read that follows it
 * succeeds and must not hide it. A failed read (e.g. offline) clears at the next good read.
 */
export function useTimerStatus(session: Session | null) {
	const [status, setStatusState] = useState<TimerStatus | null>(null);
	const [readAt, setReadAt] = useState(() => Date.now());
	const [readError, setReadError] = useState<Refusal | null>(null);
	const [refusal, setRefusal] = useState<Refusal | null>(null);
	const [loading, setLoading] = useState(true);
	const [now, setNow] = useState(() => Date.now());
	const portRef = useRef<chrome.runtime.Port | null>(null);

	const setStatus = useCallback((next: TimerStatus) => {
		setStatusState(next);
		setReadAt(Date.now());
	}, []);

	const refresh = useCallback(async () => {
		if (!session) {
			return null;
		}
		try {
			const next = await getTimerStatus(session);
			setStatus(next);
			setReadError(null);
			return next;
		} catch (failure) {
			setReadError(failureOf(failure));
			return null;
		} finally {
			setLoading(false);
		}
	}, [session, setStatus]);

	useEffect(() => {
		const port = browser.runtime.connect({ name: 'timer' });
		portRef.current = port;
		port.onMessage.addListener((message: IPostMessage<TimerStatus | null>) => {
			if (message.type === MessageTypesFromBackgroundEnum.statusUpdate && message.payload) {
				setStatus(message.payload);
			}
		});
		return () => port.disconnect();
	}, [setStatus]);

	useEffect(() => {
		void refresh();
		const poll = setInterval(() => void refresh(), POLL_EVERY_MS);
		return () => clearInterval(poll);
	}, [refresh]);

	const isRunning = Boolean(status?.running && status.lastLog);

	useEffect(() => {
		if (!isRunning) {
			return undefined;
		}
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, [isRunning]);

	const notifyBackground = useCallback(() => {
		portRef.current?.postMessage({ type: MessageTypesToBackgroundEnum.refreshStatus });
	}, []);

	const { runSeconds, todaySeconds } = countsOf(status, isRunning, now, readAt);
	const error = refusal ?? readError;

	return { status, error, loading, isRunning, runSeconds, todaySeconds, refresh, notifyBackground, setRefusal };
}
