import type { TUser } from '@/core/types/schemas';
import type { TEmailVerificationStatus } from '@/core/types/schemas/auth/email-verification.schema';

/**
 * What the API said of the signed-in user's address verification: its status, `null` where the deployment verifies no
 * address, `undefined` while that is not known (not asked yet, or the call failed).
 */
export type EmailVerificationState = TEmailVerificationStatus | null | undefined;

type VerifiableUser = Pick<TUser, 'isEmailVerified'> | null | undefined;

/**
 * Whether the person may use what the app keeps for a verified address (inviting, creating a team, a project or a
 * task, tracking time): their address is verified, or the deployment verifies no address. Until the API has said
 * which, an unverified address keeps them waiting, as it always has. The status is read after the user, so it also
 * lets through an address verified meanwhile (in another browser) before the user is read again.
 */
export function isEmailVerificationSatisfied(user: VerifiableUser, state: EmailVerificationState): boolean {
	if (!user) {
		return false;
	}
	if (user.isEmailVerified) {
		return true;
	}
	if (state === null) {
		return true;
	}

	return state?.isEmailVerified === true;
}

/**
 * Whether to ask the person to verify their address: only once the API confirmed that the deployment verifies
 * addresses and that theirs is not verified yet. Where it verifies none, no code is ever sent, so none is asked for.
 */
export function asksForEmailVerification(user: VerifiableUser, state: EmailVerificationState): boolean {
	if (!user || user.isEmailVerified) {
		return false;
	}

	return state?.isEmailVerified === false;
}

/** Whether a verification e-mail that is still valid went out, so the app may say a code was sent. */
export function wasVerificationEmailSent(state: EmailVerificationState): boolean {
	return state?.verificationEmailSent === true;
}
