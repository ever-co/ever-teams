'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { JitsiApiLoadError, loadJitsiExternalApi, normalizeMeetDomain } from '@/core/lib/utils/jitsi-external-api';

type JitsiApiState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; error: JitsiApiLoadError };

/**
 * The Jitsi Meet API of the configured meeting host, loaded before the room renders: a host that fails ends in an
 * error the room can show with a retry, instead of the SDK's spinner that never ends.
 */
export function useJitsiExternalApi(configuredDomain: string) {
	const domain = useMemo(() => normalizeMeetDomain(configuredDomain), [configuredDomain]);
	const [state, setState] = useState<JitsiApiState>({ status: 'loading' });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		// A load that ends after the page moved on, or after a retry started another one, changes nothing
		let current = true;

		loadJitsiExternalApi(domain).then(
			() => {
				if (current) {
					setState({ status: 'ready' });
				}
			},
			(error: unknown) => {
				if (!current) {
					return;
				}
				let loadError = new JitsiApiLoadError('unreachable', domain);
				if (error instanceof JitsiApiLoadError) {
					loadError = error;
				}
				setState({ status: 'error', error: loadError });
			}
		);

		return () => {
			current = false;
		};
	}, [domain, attempt]);

	const retry = useCallback(() => {
		setState({ status: 'loading' });
		setAttempt((count) => count + 1);
	}, []);

	return { domain, retry, ...state };
}
