'use client';

import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { docsService } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';

/**
 * Whether the platform serves the documents (`/plugins/docs/documents`). Decided once per page load from the
 * first count request: a platform without the extension, or with its feature off, answers 404; the sidebar entry
 * then hides and `/docs` says so. `unknown` until that first answer.
 */
export type DocsAvailability = 'unknown' | 'available' | 'unavailable';

export const docsAvailabilityAtom = atom<DocsAvailability>('unknown');

/** What an error of the probe says about the extension. */
export function availabilityFromError(error: unknown): DocsAvailability {
	if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) return 'unavailable';
	// A transport failure or a 401 says nothing about the extension: ask again next time.
	return 'unknown';
}

let probe: Promise<DocsAvailability> | null = null;

/** Asks once (per page load) whether the extension is there; concurrent callers share the answer. */
export function probeDocsAvailability(): Promise<DocsAvailability> {
	if (!probe) {
		probe = docsService
			.count({ kind: [EDocumentKind.PAGE], archived: 'exclude' })
			.then((): DocsAvailability => 'available')
			.catch((error: unknown) => {
				const answer = availabilityFromError(error);
				if (answer === 'unknown') probe = null;
				return answer;
			});
	}
	return probe;
}

/** For the specs. */
export function resetDocsAvailabilityProbe(): void {
	probe = null;
}

export function useDocsAvailability(enabled: boolean): DocsAvailability {
	const [availability, setAvailability] = useAtom(docsAvailabilityAtom);

	useEffect(() => {
		if (!enabled || availability !== 'unknown') return;
		let current = true;
		void probeDocsAvailability().then((answer) => {
			if (current && answer !== 'unknown') setAvailability(answer);
		});
		return () => {
			current = false;
		};
	}, [availability, enabled, setAvailability]);

	return availability;
}
