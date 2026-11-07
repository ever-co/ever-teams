'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { atom, useAtom } from 'jotai';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { inboxService } from '@/core/services/client/api/inbox';
import { ApiErrorService } from '@/core/services/client/api-error.service';

/**
 * Whether the platform serves the inbox extension (`/inbox/items`). Decided per backend from a counts request: a
 * platform without it answers 404, and the page then works with the bell's data (read, unread and archive only).
 * `unknown` until that answer.
 */
export type InboxAvailability = 'unknown' | 'available' | 'unavailable';

/** The answer, and the backend it is about (the desktop app can switch backends while the page stays open). */
export const inboxAvailabilityAtom = atom<{ base: string; value: InboxAvailability }>({ base: '', value: 'unknown' });

/** What an error of the counts request says about the extension. */
export function availabilityFromError(error: unknown): InboxAvailability {
	if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) return 'unavailable';
	// A transport failure or a 401 says nothing about the extension: ask again.
	return 'unknown';
}

/** The backend the app's requests go to now. */
function currentBase(): string {
	return String(GAUZY_API_BASE_SERVER_URL.value ?? '');
}

let probe: { base: string; answer: Promise<InboxAvailability> } | null = null;

/** Asks once per backend whether the extension is there; concurrent callers share the answer. */
export function probeInboxAvailability(base: string = currentBase()): Promise<InboxAvailability> {
	if (!probe || probe.base !== base) {
		const answer: Promise<InboxAvailability> = inboxService
			.counts()
			.then((): InboxAvailability => 'available')
			.catch((error: unknown) => {
				const result = availabilityFromError(error);
				// Unknown: forget the attempt, so the next one asks again.
				if (result === 'unknown' && probe?.answer === answer) probe = null;
				return result;
			});
		probe = { base, answer };
	}
	return probe.answer;
}

/** For the specs, and the page's retry. */
export function resetInboxAvailabilityProbe(): void {
	probe = null;
}

/** The first retries come quickly, then every 30 seconds: the page recovers when the platform does. */
function retryDelayMs(failures: number): number {
	return Math.min(30_000, 2_000 * 2 ** Math.min(Math.max(failures - 1, 0), 4));
}

export interface InboxAvailabilityState {
	availability: InboxAvailability;
	/** The last probe failed for a reason that says nothing about the extension (offline, a 5xx): show it, offer a retry. */
	probeFailed: boolean;
	retry: () => void;
}

export function useInboxAvailability(enabled: boolean): InboxAvailabilityState {
	const [stored, setStored] = useAtom(inboxAvailabilityAtom);
	const base = currentBase();
	const availability: InboxAvailability = stored.base === base ? stored.value : 'unknown';
	const [failures, setFailures] = useState(0);
	const failuresRef = useRef(0);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!enabled || availability !== 'unknown') return;
		let current = true;
		let timer: ReturnType<typeof setTimeout> | null = null;
		void probeInboxAvailability(base).then((answer) => {
			if (!current) return;
			if (answer !== 'unknown') {
				failuresRef.current = 0;
				setFailures(0);
				setStored({ base, value: answer });
				return;
			}
			failuresRef.current += 1;
			setFailures(failuresRef.current);
			timer = setTimeout(() => setAttempt((value) => value + 1), retryDelayMs(failuresRef.current));
		});
		return () => {
			current = false;
			if (timer !== null) clearTimeout(timer);
		};
	}, [attempt, availability, base, enabled, setStored]);

	const retry = useCallback(() => {
		resetInboxAvailabilityProbe();
		setAttempt((value) => value + 1);
	}, []);

	return { availability, probeFailed: availability === 'unknown' && failures > 0, retry };
}
