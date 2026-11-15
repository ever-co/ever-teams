import { refusalOf, type ApiFailure, type Refusal } from '~lib/refusal';

/**
 * The `code` of the 403 a workspace sign-in answers instead of a session when the account asks for its two-factor code
 * (Gauzy `/api/auth/two-factor/*`), as the web reads it (`core/lib/auth/two-factor`).
 */
const TWO_FACTOR_REQUIRED_CODE = 'TWO_FACTOR_REQUIRED';

/** A code from an authenticator app: six digits (RFC 6238). */
const AUTHENTICATOR_CODE = /^\d{6}$/;

/** The fewest letters and digits a recovery code has (the API writes them `XXXX-XXXX-XXXX-XXXX`). */
const RECOVERY_CODE_MIN_CHARACTERS = 8;

/** What a sign-in answered instead of a session: the challenge to send back with the code, and when it ends. */
export interface TwoFactorChallenge {
	challenge: string;
	/** When the challenge stops being accepted (ISO 8601), empty when the API did not say. */
	expiresAt: string;
}

/** A proof of the second factor: a current code of the authenticator app, or one of the recovery codes. */
export type TwoFactorProof = { code: string } | { recoveryCode: string };

function textOf(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	return '';
}

/** The challenge in the body of a failed call, or null for any other answer. */
export function twoFactorChallengeIn(body: unknown): TwoFactorChallenge | null {
	const answer = (body ?? {}) as { code?: unknown; challenge?: unknown; expiresAt?: unknown };
	const challenge = textOf(answer.challenge);
	if (answer.code !== TWO_FACTOR_REQUIRED_CODE || !challenge) {
		return null;
	}
	return { challenge, expiresAt: textOf(answer.expiresAt) };
}

/** A typed proof: six digits are a code of the app, anything longer a recovery code; null when it is neither yet. */
export function twoFactorProofOf(value: string): TwoFactorProof | null {
	const compact = value.replace(/\s/g, '');
	if (AUTHENTICATOR_CODE.test(compact)) {
		return { code: compact };
	}
	const recoveryCode = compact.toUpperCase().replace(/[^A-Z0-9-]/g, '');
	const isRecoveryCode = recoveryCode.replaceAll('-', '').length >= RECOVERY_CODE_MIN_CHARACTERS;
	if (isRecoveryCode) {
		return { recoveryCode };
	}
	return null;
}

/**
 * The words for a failed code step. The API answers a wrong code and a sign-in that waited too long alike (401): a
 * 401 while the challenge lasts is a wrong code, and one after it ended asks to sign in again.
 */
export function twoFactorRefusalOf(failure: ApiFailure, expiresAt: string, now: number): Refusal {
	if (failure.status === 429) {
		return { key: 'signInTwoFactorTooMany' };
	}
	const expiry = Date.parse(expiresAt);
	const hasEnded = Number.isFinite(expiry) && now >= expiry;
	if (failure.status === 401 && hasEnded) {
		return { key: 'signInTwoFactorExpired' };
	}
	const isWrongCode = failure.status === 400 || failure.status === 401;
	if (isWrongCode) {
		return { key: 'signInTwoFactorWrongCode' };
	}
	return refusalOf(failure);
}
