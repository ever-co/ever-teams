'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { getTimerStatus } from '@ever-teams/api';
import { IServerError, ITimerStatus } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from './teams-context';

// The Ever Teams web app's rate: one status read a minute, and none while the page is hidden.
export const TIMER_STATUS_REFRESH_MS = 60_000;

export interface ITimerStatusContext {
	status: ITimerStatus | null;
	loading: boolean;
	refetch: () => Promise<void>;
	// Registers a component that shows the timer; returns its unregister function. The status is read only while
	// at least one is mounted.
	registerConsumer: () => () => void;
}

const TimerStatusContext = createContext<ITimerStatusContext | null>(null);

export const useTimerStatusContext = (): ITimerStatusContext | null => useContext(TimerStatusContext);

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

/**
 * One timer status for every widget under a TeamsProvider: one read feeds them all, and a start or a stop in one of
 * them refreshes the others at once (`refetch`).
 */
export function TimerStatusProvider({ children }: { children?: ReactNode }) {
	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const [status, setStatus] = useState<ITimerStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [consumerCount, setConsumerCount] = useState(0);
	const inFlight = useRef<Promise<void> | null>(null);
	const failing = useRef(false);

	const hasEmployee = Boolean(user?.employee);
	const signedIn = Boolean(token && organizationId);
	const ready = hasEmployee && signedIn;
	const hasConsumers = consumerCount > 0;

	const registerConsumer = useCallback(() => {
		setConsumerCount((count) => count + 1);
		return () => setConsumerCount((count) => count - 1);
	}, []);

	// One notice for an outage, not one per read: the next successful read ends it.
	const reportFailure = useCallback((message: string) => {
		if (failing.current) {
			return;
		}
		failing.current = true;
		toast({ variant: 'destructive', description: message });
	}, []);

	const refetch = useCallback(async () => {
		if (!ready) {
			return;
		}
		if (inFlight.current) {
			return inFlight.current;
		}
		const read = (async () => {
			setLoading(true);
			try {
				const response = await getTimerStatus(user, token, organizationId);
				if (isServerError(response)) {
					reportFailure(errorMessageOf(response));
					return;
				}
				failing.current = false;
				setStatus(response);
			} catch (error) {
				reportFailure((error as Error).message);
			} finally {
				setLoading(false);
				inFlight.current = null;
			}
		})();
		inFlight.current = read;
		return read;
	}, [ready, user, token, organizationId, reportFailure]);

	useEffect(() => {
		if (!ready || !hasConsumers) {
			return;
		}
		refetch();
		const pollWhenVisible = () => {
			if (pageIsVisible()) {
				refetch();
			}
		};
		const refetchNow = () => {
			refetch();
		};
		const interval = setInterval(pollWhenVisible, TIMER_STATUS_REFRESH_MS);
		document.addEventListener('visibilitychange', pollWhenVisible);
		window.addEventListener('focus', refetchNow);
		window.addEventListener('online', refetchNow);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', pollWhenVisible);
			window.removeEventListener('focus', refetchNow);
			window.removeEventListener('online', refetchNow);
		};
	}, [ready, hasConsumers, refetch]);

	return (
		<TimerStatusContext.Provider value={{ status, loading, refetch, registerConsumer }}>
			{children}
		</TimerStatusContext.Provider>
	);
}
