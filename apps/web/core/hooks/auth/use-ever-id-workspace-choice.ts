'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { restartEverIdSignIn } from '@/core/lib/auth/ever-id/restart';
import {
	isAccountNotReadyError,
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
 * turns out to have its workspace already, the usual workspace sign-in continues. A workspace whose usual sign-in
 * stops because the account has no organization yet (its setup stopped after the tenant) is set up the same way.
 */
export function useEverIdWorkspaceChoice(everIdSession: EverIdChooserData | null) {
	const router = useRouter();
	const [setupRunning, setSetupRunning] = useState(false);
	// The workspace the person chose last (the usual workspace sign-in's failure refers to it).
	const chosen = useRef(-1);

	/** Sets up the workspace at `index`; `onNothingToSetUp` runs when the account has its workspace already. */
	const finishSetup = useCallback(
		async (index: number, onNothingToSetUp?: () => void) => {
			setSetupRunning(true);
			let status: number;
			try {
				({ status } = await everIdService.finishSetup(index, userTimezone()));
			} catch {
				setSetupRunning(false);
				return;
			}
			if (status === 200) {
				// The Gauzy cookies are the session from now on: the next-auth one (with the chooser data) ends.
				try {
					await signOut({ redirect: false });
				} catch {
					// The Gauzy cookies are set either way.
				}
				router.push('/');
				return;
			}
			setSetupRunning(false);
			if (status === 410) {
				restartEverIdSignIn();
			} else if (status === 409) {
				onNothingToSetUp?.();
			}
		},
		[router]
	);

	/**
	 * Takes over the choice of the workspace at `index` (with its `token`) when it needs more than the usual
	 * workspace sign-in, which `signInUsually` runs; `true` when it did.
	 */
	const continueChoice = useCallback(
		(index: number, token: string | undefined, signInUsually: () => void): boolean => {
			if (!everIdSession) return false;
			chosen.current = index;
			if (token && isWorkspaceTokenExpired(token)) {
				restartEverIdSignIn();
				return true;
			}
			if (!everIdSession.tenantless.includes(index)) return false;
			void finishSetup(index, signInUsually);
			return true;
		},
		[everIdSession, finishSetup]
	);

	/**
	 * For the usual workspace sign-in: a workspace token that expired meanwhile starts the Ever ID sign-in again; an
	 * account without an organization yet has its setup finished.
	 */
	const onWorkspaceSigninError = useMemo(
		() =>
			everIdSession
				? (error: unknown) => {
						if (isExpiredWorkspaceTokenError(error)) {
							restartEverIdSignIn();
						} else if (isAccountNotReadyError(error) && chosen.current >= 0) {
							void finishSetup(chosen.current);
						}
					}
				: undefined,
		[everIdSession, finishSetup]
	);

	return { continueChoice, onWorkspaceSigninError, setupRunning };
}
