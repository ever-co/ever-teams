'use client';

import { useCallback, useState } from 'react';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { navigateAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { twoFactorSignInFailureOf, type TwoFactorSignInFailure } from '@/core/lib/auth/two-factor';
import type { ITwoFactorChallenge, ITwoFactorProof } from '@/core/types/interfaces/auth/two-factor';

type PendingSignIn = {
	challenge: ITwoFactorChallenge;
	/** The team the sign-in opens once the code is accepted. */
	selectedTeam: string;
};

/**
 * The code step of a sign-in whose account asks for a second factor. The workspace sign-in answers a challenge
 * instead of a session (`ask`); the code of the authenticator app, or a recovery code, completes it (`verify`) and the
 * app opens as after any sign-in. An account without two-factor authentication never reaches this step.
 */
export function useTwoFactorSignIn() {
	const [pending, setPending] = useState<PendingSignIn | null>(null);
	const [failure, setFailure] = useState<TwoFactorSignInFailure | null>(null);
	const [verifying, setVerifying] = useState(false);
	const [signedIn, setSignedIn] = useState(false);

	const ask = useCallback((challenge: ITwoFactorChallenge, selectedTeam: string) => {
		setPending({ challenge, selectedTeam });
		setFailure(null);
		setSignedIn(false);
	}, []);

	const cancel = useCallback(() => {
		setPending(null);
		setFailure(null);
	}, []);

	/** True once the code is accepted; the page then opens the app (and the step keeps its loading state). */
	const verify = useCallback(
		async (proof: ITwoFactorProof): Promise<boolean> => {
			if (!pending) {
				return false;
			}
			setVerifying(true);
			setFailure(null);
			try {
				await authService.verifyTwoFactor({
					challenge: pending.challenge.challenge,
					...proof,
					selectedTeam: pending.selectedTeam
				});
				setSignedIn(true);
				navigateAfterSignIn();
				return true;
			} catch (error) {
				setFailure(twoFactorSignInFailureOf(error, pending.challenge.expiresAt, Date.now()));
				return false;
			} finally {
				setVerifying(false);
			}
		},
		[pending]
	);

	return { pending, ask, cancel, verify, verifying, signedIn, failure };
}

export type TTwoFactorSignIn = ReturnType<typeof useTwoFactorSignIn>;
