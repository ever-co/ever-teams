import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { sessionAtom, sessionStateFrom } from './session';
import type { Session } from './session';

/**
 * The new Home's session follows the current app's authentication store, which holds the session once the app runs
 * on Expo Router: a sign-in, a renewal or a sign-out shows at once, and another person's session never keeps the
 * previous one's saved answers. Until the store is restored, the session stays loading.
 */
export function useSessionFromStore(restored: boolean, stored: Partial<Session>): void {
	const setSession = useSetAtom(sessionAtom);
	const { accessToken, refreshToken, tenantId, organizationId } = stored;
	useEffect(() => {
		if (!restored) {
			return;
		}
		setSession(
			sessionStateFrom({
				accessToken,
				refreshToken: refreshToken || undefined,
				tenantId: tenantId || undefined,
				organizationId: organizationId || undefined
			})
		);
	}, [restored, accessToken, refreshToken, tenantId, organizationId, setSession]);
}
