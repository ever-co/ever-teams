'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { restartEverIdSignIn } from '@/core/lib/auth/ever-id/restart';
import {
	isExpiredWorkspaceTokenError,
	isWorkspaceTokenExpired,
	type EverIdChooserData
} from '@/core/lib/auth/ever-id/session';
import { userTimezone } from '@/core/lib/helpers/date-and-time';
import { everIdService } from '@/core/services/client/api/auth/ever-id.service';

/**
 * The Ever ID part of the workspace chooser after an Ever ID sign-in; for any other session it does nothing.
 *
 * The workspace tokens of an Ever ID sign-in last 15 minutes: a token that expired, before or during the usual
 * workspace sign-in, starts the Ever ID sign-in again instead of failing. A workspace without a tenant yet (an
 * account whose setup did not finish, or a sign-up completed after checkout) is set up through
 * `POST /api/auth/ever-id/finish-setup` instead of being refused; the person is then signed in. When the account
 * turns out to have its workspace already, the usual workspace sign-in continues.
 */
export function useEverIdWorkspaceChoice(everIdSession: EverIdChooserData | null) {
	const router = useRouter();
	const [setupRunning, setSetupRunning] = useState(false);

	/**
	 * Takes over the choice of the workspace at `index` (with its `token`) when it needs more than the usual
	 * workspace sign-in, which `signInUsually` runs; `true` when it did.
	 */
	const continueChoice = useCallback(
		(index: number, token: string | undefined, signInUsually: () => void): boolean => {
			if (!everIdSession) return false;
			if (token && isWorkspaceTokenExpired(token)) {
				restartEverIdSignIn();
				return true;
			}
			if (!everIdSession.tenantless.includes(index)) return false;
			setSetupRunning(true);
			everIdService
				.finishSetup(index, userTimezone())
				.then(async ({ status }) => {
					if (status === 200) {
						// The Gauzy cookies are the session from now on: the next-auth one (with the chooser data) ends.
						await signOut({ redirect: false }).catch(() => undefined);
						router.push('/');
						return;
					}
					setSetupRunning(false);
					if (status === 410) {
						restartEverIdSignIn();
					} else if (status === 409) {
						signInUsually();
					}
				})
				.catch(() => setSetupRunning(false));
			return true;
		},
		[everIdSession, router]
	);

	/** For the usual workspace sign-in: a workspace token that expired meanwhile starts the Ever ID sign-in again. */
	const onWorkspaceSigninError = useMemo(
		() =>
			everIdSession
				? (error: unknown) => {
						if (isExpiredWorkspaceTokenError(error)) restartEverIdSignIn();
					}
				: undefined,
		[everIdSession]
	);

	return { continueChoice, onWorkspaceSigninError, setupRunning };
}
