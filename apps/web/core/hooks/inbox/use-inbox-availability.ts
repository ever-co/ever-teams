'use client';

import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { inboxService } from '@/core/services/client/api/inbox';
import { ApiErrorService } from '@/core/services/client/api-error.service';

/**
 * Whether the platform serves the inbox extension (`/inbox/items`). Decided once per session from the first
 * counts request: a platform without it answers 404, and the page then works with the bell's data (read, unread
 * and archive only). `unknown` until that first answer.
 */
export type InboxAvailability = 'unknown' | 'available' | 'unavailable';

export const inboxAvailabilityAtom = atom<InboxAvailability>('unknown');

/** What an error of the counts request says about the extension. */
export function availabilityFromError(error: unknown): InboxAvailability {
	if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) return 'unavailable';
	// A transport failure or a 401 says nothing about the extension: ask again next time.
	return 'unknown';
}

let probe: Promise<InboxAvailability> | null = null;

/** Asks once (per page load) whether the extension is there; concurrent callers share the answer. */
export function probeInboxAvailability(): Promise<InboxAvailability> {
	if (!probe) {
		probe = inboxService
			.counts()
			.then((): InboxAvailability => 'available')
			.catch((error: unknown) => {
				const answer = availabilityFromError(error);
				if (answer === 'unknown') probe = null;
				return answer;
			});
	}
	return probe;
}

/** For the specs. */
export function resetInboxAvailabilityProbe(): void {
	probe = null;
}

export function useInboxAvailability(enabled: boolean): InboxAvailability {
	const [availability, setAvailability] = useAtom(inboxAvailabilityAtom);

	useEffect(() => {
		if (!enabled || availability !== 'unknown') return;
		let current = true;
		void probeInboxAvailability().then((answer) => {
			if (current && answer !== 'unknown') setAvailability(answer);
		});
		return () => {
			current = false;
		};
	}, [availability, enabled, setAvailability]);

	return availability;
}
