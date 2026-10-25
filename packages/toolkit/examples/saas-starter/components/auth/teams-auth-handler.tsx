'use client';

import { ReactElement, useEffect, useRef } from 'react';
import { useAccessToken } from '@ever-teams/atoms';

/**
 * Component that completes the Teams authentication after a successful local sign-in or sign-up.
 * This runs on the dashboard and other authenticated pages.
 *
 * The sign-in / sign-up action connects the account to Teams on the server (`lib/auth/teams-handoff.ts`), so no
 * credentials are kept in the browser: this only collects the resulting Teams token, once, from the hand-off route.
 */
const HANDOFF_ATTEMPTS = 3;

export function TeamsAuthHandler(): ReactElement | null {
	const { setAccessToken, accessToken } = useAccessToken();
	const requested = useRef(false);

	useEffect(() => {
		// Skip if already has Teams token or already asked
		if (accessToken || requested.current) {
			return;
		}
		requested.current = true;
		// Leaving the page stops the tries: no request, no timer and no token from a page that is gone
		const controller = new AbortController();

		// A few tries a little apart: a network blip or a busy server must not leave the page without its Teams token
		// until the next sign-in. A 401 (no local session) or an answer without a token ends it at once.
		const collectTeamsToken = async () => {
			for (let attempt = 1; attempt <= HANDOFF_ATTEMPTS && !controller.signal.aborted; attempt++) {
				try {
					const res = await fetch('/api/teams/handoff', {
						method: 'POST',
						credentials: 'same-origin',
						signal: controller.signal
					});
					if (res.ok) {
						const { token } = (await res.json()) as { token: string | null };
						if (token && !controller.signal.aborted) {
							// Use Teams's native session management
							setAccessToken(token);
						}
						return;
					}
					if (res.status === 401) return;
				} catch (error) {
					if (controller.signal.aborted) return;
					console.warn('❌ Teams authentication failed:', error);
				}
				if (attempt < HANDOFF_ATTEMPTS) {
					await new Promise<void>((resolve) => {
						const timer = setTimeout(resolve, attempt * 1_000);
						controller.signal.addEventListener('abort', () => {
							clearTimeout(timer);
							resolve();
						});
					});
				}
			}
		};

		void collectTeamsToken();
		return () => controller.abort();
	}, [accessToken, setAccessToken]);

	// This component renders nothing visible
	return null;
}
