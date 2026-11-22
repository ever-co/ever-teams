/** The code the API gives a sign-in that waits for a code of the person's authenticator app. */
export const TWO_FACTOR_REQUIRED_CODE = 'TWO_FACTOR_REQUIRED';

/** The length of a code from an authenticator app (RFC 6238). */
export const TWO_FACTOR_CODE_LENGTH = 6;

/** The fewest letters and digits of a recovery code (the API writes them `XXXX-XXXX-XXXX-XXXX`). */
const RECOVERY_CODE_MIN_CHARACTERS = 8;

/** A sign-in the API keeps waiting for a code: what completes it, and until when. */
export interface TwoFactorChallenge {
	challenge: string;
	expiresAt: string;
}

/** Why the code step of a sign-in failed, for the message it shows. */
export type TwoFactorFailure = 'wrong-code' | 'expired' | 'too-many' | 'failed';

/**
 * The challenge of a sign-in the API answered with `TWO_FACTOR_REQUIRED`, or null for any other answer.
 *
 * @param answer What a sign-in request answered (a failed answer keeps the API's body).
 */
export function twoFactorChallengeOf(answer: object): TwoFactorChallenge | null {
	const body = answer as { code?: unknown; challenge?: unknown; expiresAt?: unknown };
	if (body.code !== TWO_FACTOR_REQUIRED_CODE) {
		return null;
	}
	if (typeof body.challenge !== 'string' || body.challenge.length === 0) {
		return null;
	}
	const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : '';
	return { challenge: body.challenge, expiresAt };
}

/**
 * Why the code step failed. The API answers a wrong code and a sign-in that waited too long alike (401): a 401 while
 * the challenge lasts is a wrong code, and one after it ended asks to sign in again, as the web app tells them apart.
 *
 * @param answer What the verify request answered.
 * @param expiresAt When the challenge ends (ISO date), as the sign-in gave it.
 * @param now The time of the answer, in milliseconds.
 */
export function twoFactorFailureOf(answer: object, expiresAt: string, now: number): TwoFactorFailure {
	const status = Number((answer as { statusCode?: unknown }).statusCode);
	if (status === 429) {
		return 'too-many';
	}
	if (status === 400) {
		return 'wrong-code';
	}
	if (status !== 401) {
		return 'failed';
	}
	const expiry = Date.parse(expiresAt);
	const hasEnded = Number.isFinite(expiry) && now >= expiry;
	if (hasEnded) {
		return 'expired';
	}
	return 'wrong-code';
}

/** The digits of a typed or pasted authenticator code, six at most. */
export function authenticatorCodeOf(value: string): string {
	return value.replace(/\D/g, '').slice(0, TWO_FACTOR_CODE_LENGTH);
}

/** A recovery code as the API writes it: upper case, letters, digits and dashes. */
export function recoveryCodeOf(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/** Whether a code is complete enough to send: six digits, or a whole recovery code. */
export function isCompleteTwoFactorCode(value: string, isRecovery: boolean): boolean {
	if (isRecovery) {
		return value.replace(/-/g, '').length >= RECOVERY_CODE_MIN_CHARACTERS;
	}
	return value.length === TWO_FACTOR_CODE_LENGTH;
}
