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
export function TeamsAuthHandler(): ReactElement | null {
	const { setAccessToken, accessToken } = useAccessToken();
	const requested = useRef(false);

	useEffect(() => {
		// Skip if already has Teams token or already asked
		if (accessToken || requested.current) {
			return;
		}
		requested.current = true;

		const collectTeamsToken = async () => {
			try {
				const res = await fetch('/api/teams/handoff', { method: 'POST', credentials: 'same-origin' });
				if (!res.ok) return;
				const { token } = (await res.json()) as { token: string | null };
				if (token) {
					// Use Teams's native session management
					setAccessToken(token);
				}
			} catch (error) {
				console.warn('❌ Teams authentication failed:', error);
			}
		};

		void collectTeamsToken();
	}, [accessToken, setAccessToken]);

	// This component renders nothing visible
	return null;
}
