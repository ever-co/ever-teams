import { useCallback, useEffect, useState } from 'react';

import { clearSession, loadSession, saveSession, saveSelectedTaskId } from '~lib/session-store';
import type { Session } from '~lib/workspaces';
import browser from '~misc/browser';

/** The signed-in person as kept in the extension's storage, followed when another view or the background changes it. */
export function useSession() {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let isOpen = true;
		void loadSession().then((stored) => {
			if (isOpen) {
				setSession(stored);
				setLoading(false);
			}
		});
		const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
			const sessionChanged = area === 'local' && 'session' in changes;
			if (sessionChanged) {
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
		await saveSession(next);
		setSession(next);
	}, []);

	const signOut = useCallback(async () => {
		await clearSession();
		setSession(null);
	}, []);

	/** Makes another of the person's teams the active one; the picked task belonged to the previous team. */
	const selectTeam = useCallback(
		async (teamId: string) => {
			if (!session) {
				return;
			}
			const next = { ...session, teamId };
			await saveSelectedTaskId(null);
			await saveSession(next);
			setSession(next);
		},
		[session]
	);

	return { session, loading, signedIn, signOut, selectTeam };
}
