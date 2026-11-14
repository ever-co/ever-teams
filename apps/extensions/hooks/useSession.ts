import { useCallback, useEffect, useState } from 'react';

import { revokeSession } from '~lib/api-client';
import { loadSession, selectStoredTeam, storeSignIn, takeSessionOut } from '~lib/session-store';
import type { Session } from '~lib/workspaces';
import browser from '~misc/browser';

/** The signed-in person as kept in the extension's storage, followed when another view or the background changes it. */
export function useSession() {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let isOpen = true;
		// A change that lands before the first read answers is newer than what that read found
		let isFirstReadSuperseded = false;
		void loadSession().then((stored) => {
			if (!isOpen) {
				return;
			}
			if (!isFirstReadSuperseded) {
				setSession(stored);
			}
			setLoading(false);
		});
		const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
			const sessionChanged = area === 'local' && 'session' in changes;
			if (sessionChanged) {
				isFirstReadSuperseded = true;
				setSession((changes.session.newValue as Session | undefined) ?? null);
			}
		};
		browser.storage.onChanged.addListener(onChanged);
		return () => {
			isOpen = false;
			browser.storage.onChanged.removeListener(onChanged);
		};
	}, []);

	const signedIn = useCallback(async (next: Session) => {
		await storeSignIn(next);
		setSession(next);
	}, []);

	/** Signs out here, then has the API revoke the session's refresh token. */
	const signOut = useCallback(async () => {
		const stored = await takeSessionOut();
		setSession(null);
		if (stored) {
			await revokeSession(stored);
		}
	}, []);

	/** Makes another of the person's teams the active one; the picked task belonged to the previous team. */
	const selectTeam = useCallback(
		async (teamId: string) => {
			if (!session) {
				return;
			}
			const next = await selectStoredTeam(session, teamId);
			setSession(next);
		},
		[session]
	);

	return { session, loading, signedIn, signOut, selectTeam };
}
