'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	ReactNode,
	CSSProperties
} from 'react';
import { useTranslation } from 'react-i18next';
import { getTimerStatus, timerChangeOf } from '@ever-teams/api';
import { IServerError, ITimerStatus, TimerChange } from '@ever-teams/toolkit-types';
import { useTeamsContext } from './teams-context';
import { KIT_ERROR_MESSAGE_KEYS, KitNotice, kindOfFailedRequest, noticeOfFailure } from '@lib/errors/kit-error';
import { kitNoticeAtom } from '@lib/errors/kit-notice-atom';
import { useAtom } from 'jotai';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';

// The Ever Teams web app's rate: one status read a minute, and none while the page is hidden.
export const TIMER_STATUS_REFRESH_MS = 60_000;

export interface ITimerStatusContext {
	status: ITimerStatus | null;
	loading: boolean;
	refetch: () => Promise<void>;
	// Registers a component that shows the timer; returns its unregister function. The status is read only while
	// at least one is mounted.
	registerConsumer: () => () => void;
	// True while a start or a stop runs in one of the widgets: every widget shows it as loading.
	actionPending: boolean;
	// Runs a start or a stop unless one already runs for this provider: a second one, from any widget, is ignored.
	runAction: (action: () => Promise<void>) => Promise<void>;
	// What went wrong, shown inside the widgets (KitNotice) instead of a toast on the host page; null once a read
	// succeeds.
	notice: KitNotice | null;
	reportNotice: (notice: KitNotice | null) => void;
	// True once the person is signed out while the last read showed the timer running, until someone signs in: the
	// timer runs on in Ever Teams, where this page can no longer stop it.
	leftRunning: boolean;
}

const TimerStatusContext = createContext<ITimerStatusContext | null>(null);

export const useTimerStatusContext = (): ITimerStatusContext | null => useContext(TimerStatusContext);

const visuallyHidden: CSSProperties = {
	position: 'absolute',
	width: 1,
	height: 1,
	padding: 0,
	margin: -1,
	overflow: 'hidden',
	clip: 'rect(0, 0, 0, 0)',
	whiteSpace: 'nowrap',
	border: 0
};

// The text of an error answer: Gauzy sends `message` as a string or a list; other failures carry `error`.
export function errorMessageOf(response: { message?: unknown; error?: unknown }): string {
	if ('message' in response && response.message !== undefined) {
		const message = response.message as string | string[];
		if (Array.isArray(message)) {
			return message.join(', ');
		}
		return message;
	}
	return String(response.error);
}

const isServerError = (response: ITimerStatus | IServerError): response is IServerError => {
	const hasMessage = 'message' in response;
	const hasError = 'error' in response;
	return hasMessage || hasError;
};

const pageIsVisible = () => document.visibilityState !== 'hidden';

export type OnTimerChange = (change: TimerChange) => void;

// After a render commits: a layout effect in the browser, so it runs before a pending read can settle; the server runs
// neither.
const useCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Apart from the read: an error the host's callback throws reaches the page as an uncaught error, and neither ends the
// read nor fails a start or a stop that waits for it.
function callHost(onTimerChange: OnTimerChange, change: TimerChange): void {
	try {
		onTimerChange(change);
	} catch (error) {
		setTimeout(() => {
			throw error;
		});
	}
}

/**
 * One timer status for every widget under a TeamsProvider: one read feeds them all, and a start or a stop in one of
 * them refreshes the others at once (`refetch`). `onTimerChange` hears the first read and each change a read shows.
 */
export function TimerStatusProvider({
	children,
	onTimerChange
}: Readonly<{ children?: ReactNode; onTimerChange?: OnTimerChange }>) {
	const { t } = useTranslation();
	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { api } = useKitOptions();
	const [status, setStatus] = useState<ITimerStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [consumerCount, setConsumerCount] = useState(0);
	const [actionPending, setActionPending] = useState(false);
	const actionInFlight = useRef(false);
	const [announcement, setAnnouncement] = useState('');
	// The pending reads for one identity; again: a refresh was asked while they ran.
	const inFlight = useRef<{ identity: string; promise: Promise<void>; again: boolean } | null>(null);
	// Only the read started last may set the status, show a notice or end the loading state.
	const latestRead = useRef(0);
	const [notice, setNotice] = useAtom(kitNoticeAtom);
	// The text of the notice in the live region, taken out again when the notice goes away.
	const noticeAnnounced = useRef('');
	const lastRunning = useRef<boolean | null>(null);
	const [leftRunning, setLeftRunning] = useState(false);
	// The last change the host was told (onTimerChange), null until the first read for this person and organization.
	const toldChange = useRef<TimerChange | null>(null);
	// The callback of the last render that committed: a render React drops (a transition that suspends) never becomes
	// the one a pending read calls.
	const hostCallback = useRef(onTimerChange);
	useCommitEffect(() => {
		hostCallback.current = onTimerChange;
	});
	// False once the provider is removed: a read that settles after it tells the removed provider's host nothing.
	const mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const hasEmployee = Boolean(user?.employee);
	const signedIn = Boolean(token && organizationId);
	const ready = hasEmployee && signedIn;
	const hasConsumers = consumerCount > 0;
	// The same count, for a queued read that settles after the last widget unmounted.
	const consumers = useRef(0);

	// Whose status this is: an answer read for another user, token or organization is dropped.
	const identity = `${user?.id ?? ''}|${token}|${organizationId ?? ''}`;
	// Whose status is shown: a new token for the same person and organization (the host's getToken renews it every few
	// minutes) keeps the status and the notice on screen until the next read; a sign-out drops them.
	let session = 'signed-out';
	if (token) {
		session = 'signed-in';
	}
	const owner = `${user?.id ?? ''}|${organizationId ?? ''}|${session}`;
	const currentIdentity = useRef(identity);
	currentIdentity.current = identity;

	const registerConsumer = useCallback(() => {
		consumers.current += 1;
		setConsumerCount((count) => count + 1);
		return () => {
			consumers.current -= 1;
			setConsumerCount((count) => count - 1);
		};
	}, []);

	// One notice for an outage, not one per read: the same notice again changes nothing, and the next successful read
	// ends it.
	const reportNotice = useCallback(
		(next: KitNotice | null) => {
			setNotice((current) => {
				const same = current?.kind === next?.kind && current?.message === next?.message;
				if (same) {
					return current;
				}
				return next;
			});
		},
		[setNotice]
	);

	// The host hears what a read shows only when it differs from what it was told last: no read is made for it.
	const tellHost = useCallback((status: ITimerStatus) => {
		const onChange = hostCallback.current;
		if (!onChange || !mounted.current) {
			return;
		}
		const change = timerChangeOf(status, toldChange.current);
		if (change === null) {
			return;
		}
		// A copy: a host that changes the object it receives (an embed listener on event.detail too) does not change
		// what the next read is compared to.
		toldChange.current = { ...change };
		callHost(onChange, change);
	}, []);

	// One read of the status; its answer becomes the shared status.
	const readOnce = useCallback(
		async (forIdentity: string) => {
			latestRead.current += 1;
			const read = latestRead.current;
			const isCurrent = () => read === latestRead.current && currentIdentity.current === forIdentity;
			let answered: ITimerStatus | null = null;
			setLoading(true);
			try {
				const response = await getTimerStatus(user, token, organizationId, api);
				if (!isCurrent()) {
					return;
				}
				if (isServerError(response)) {
					// The API package returns a request that got no answer as an error with no status: the probe says
					// whether this site is not allowed or Ever Teams is unreachable.
					const failure = await noticeOfFailure(response, errorMessageOf(response), apiUrlOf(api));
					if (isCurrent()) {
						reportNotice(failure);
					}
					return;
				}
				reportNotice(null);
				setStatus(response);
				answered = response;
			} catch {
				// No answer: the network or the API is down, or the browser blocked the answer for this site.
				const kind = await kindOfFailedRequest(apiUrlOf(api));
				if (isCurrent()) {
					reportNotice({ kind });
				}
			} finally {
				if (isCurrent()) {
					setLoading(false);
				}
			}
			if (answered) {
				tellHost(answered);
			}
		},
		[user, token, organizationId, reportNotice, tellHost, api]
	);

	// A refresh asked while a read is pending runs one more read after it: the pending read may predate a start or a
	// stop, and its answer must not be the last word. The caller waits for that fresh read.
	const refetch = useCallback(async () => {
		// A refetch kept from an earlier render (a start that ends after a switch of organization) reads nothing: its
		// read would supersede the current identity's pending read, whose answer would then be dropped.
		// Nor one of a removed provider (a start that ends once the provider started afresh on another address): its
		// read would go to the previous server for a status nothing shows.
		const obsolete = currentIdentity.current !== identity || !mounted.current;
		if (!ready || obsolete) {
			return;
		}
		const pending = inFlight.current;
		const pendingForThisIdentity = pending?.identity === identity;
		if (pending && pendingForThisIdentity) {
			pending.again = true;
			return pending.promise;
		}
		const record = { identity, promise: Promise.resolve(), again: false };
		// A hidden page leaves the queued read to the next visibility change; with no timer widget left, nothing reads.
		const readsAgain = () =>
			record.again && currentIdentity.current === identity && consumers.current > 0 && pageIsVisible();
		const reads = (async () => {
			do {
				record.again = false;
				await readOnce(identity);
			} while (readsAgain());
		})();
		record.promise = reads.finally(() => {
			if (inFlight.current === record) {
				inFlight.current = null;
			}
		});
		inFlight.current = record;
		return record.promise;
	}, [ready, readOnce, identity]);

	// One start or stop at a time for every widget of the page, so two clicks (in one widget or two) never start or
	// stop the timer twice, and a stop cannot run while a start is still in flight.
	const runAction = useCallback(async (action: () => Promise<void>) => {
		if (actionInFlight.current) {
			return;
		}
		actionInFlight.current = true;
		setActionPending(true);
		try {
			await action();
		} finally {
			actionInFlight.current = false;
			setActionPending(false);
		}
	}, []);

	// Another user or organization: the previous status is dropped at once, and no change is announced. The host hears
	// the next read as a first one (initial).
	useEffect(() => {
		// A sign-out does not stop the timer: one that was running runs on in Ever Teams (#5583). A sign-out reached in
		// two steps (the token, then the user) keeps what the first step saw.
		if (session === 'signed-in') {
			setLeftRunning(false);
		} else if (lastRunning.current === true) {
			setLeftRunning(true);
		}
		setStatus(null);
		setLoading(false);
		setNotice(null);
		lastRunning.current = null;
		toldChange.current = null;
	}, [owner, session]);

	// A new token for the same person drops the answer of the read still pending, and with it the loading state that
	// read would have ended; the next read sets it again.
	useEffect(() => {
		setLoading(false);
	}, [identity]);

	useEffect(() => {
		if (!ready || !hasConsumers) {
			return;
		}
		const pollWhenVisible = () => {
			if (pageIsVisible()) {
				refetch();
			}
		};
		// The browser knows at once when it goes offline: the widgets say so before the next read fails.
		const markUnreachable = () => reportNotice({ kind: 'unreachable' });
		// Automatic reads happen only while the page is visible; a hidden page reads when it becomes visible.
		pollWhenVisible();
		const interval = setInterval(pollWhenVisible, TIMER_STATUS_REFRESH_MS);
		document.addEventListener('visibilitychange', pollWhenVisible);
		window.addEventListener('focus', pollWhenVisible);
		window.addEventListener('online', pollWhenVisible);
		window.addEventListener('offline', markUnreachable);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', pollWhenVisible);
			window.removeEventListener('focus', pollWhenVisible);
			window.removeEventListener('online', pollWhenVisible);
			window.removeEventListener('offline', markUnreachable);
		};
	}, [ready, hasConsumers, refetch, reportNotice]);

	// Screen readers hear each new notice too, in the same live region.
	useEffect(() => {
		if (!notice) {
			// A notice that went away leaves the live region as well: the same failure later is announced again.
			const announced = noticeAnnounced.current;
			noticeAnnounced.current = '';
			setAnnouncement((current) => (announced && current === announced ? '' : current));
			return;
		}
		let text: string;
		if (notice.kind === 'other') {
			text = notice.message ?? '';
		} else {
			text = t(KIT_ERROR_MESSAGE_KEYS[notice.kind]);
		}
		noticeAnnounced.current = text;
		setAnnouncement(text);
	}, [notice, t]);

	// Screen readers hear a start or a stop, wherever it came from, but not the first read.
	useEffect(() => {
		if (!status) {
			return;
		}
		const running = Boolean(status.running);
		const changed = lastRunning.current !== null && lastRunning.current !== running;
		lastRunning.current = running;
		if (!changed) {
			return;
		}
		if (running) {
			setAnnouncement(t('TIME_TRACKER.TIMER_STARTED'));
			return;
		}
		setAnnouncement(t('TIME_TRACKER.TIMER_STOPPED'));
	}, [status, t]);

	const value = useMemo(
		() => ({
			status,
			loading,
			refetch,
			registerConsumer,
			actionPending,
			runAction,
			notice,
			reportNotice,
			leftRunning
		}),
		[status, loading, refetch, registerConsumer, actionPending, runAction, notice, reportNotice, leftRunning]
	);

	return (
		<TimerStatusContext.Provider value={value}>
			{children}
			<span aria-live="polite" role="status" style={visuallyHidden}>
				{announcement}
			</span>
		</TimerStatusContext.Provider>
	);
}
