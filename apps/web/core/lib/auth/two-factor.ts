import { TWO_FACTOR_REQUIRED_CODE, type ITwoFactorChallenge } from '@/core/types/interfaces/auth/two-factor';

/** The length of a code from an authenticator app (RFC 6238). */
export const TWO_FACTOR_CODE_LENGTH = 6;

/** The fewest letters and digits a recovery code has (the API writes them `XXXX-XXXX-XXXX-XXXX`). */
const RECOVERY_CODE_MIN_CHARACTERS = 8;

type UnknownRecord = Record<string, unknown>;

function recordOf(value: unknown): UnknownRecord | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	return value as UnknownRecord;
}

function stringOf(value: unknown): string | null {
	if (typeof value !== 'string' || value.length === 0) {
		return null;
	}
	return value;
}

/** The API's answer body of a failed call: an axios error's `response.data`, or the value itself. */
function bodyOf(error: unknown): UnknownRecord | null {
	const record = recordOf(error);
	const response = recordOf(record?.response);
	const data = recordOf(response?.data);
	if (data) {
		return data;
	}
	return record;
}

function httpStatusOf(error: unknown): number | null {
	const record = recordOf(error);
	const response = recordOf(record?.response);
	const status = response?.status ?? record?.statusCode;
	if (typeof status !== 'number') {
		return null;
	}
	return status;
}

/**
 * The challenge a sign-in answered instead of a session, or null for any other answer.
 *
 * Proxy mode keeps the API's 403 body (an axios error's `response.data`); direct mode turns the answer into an API
 * error whose code is `TWO_FACTOR_REQUIRED` and whose details keep the challenge.
 */
export function twoFactorChallengeOf(error: unknown): ITwoFactorChallenge | null {
	const record = recordOf(error);
	const details = recordOf(record?.details);
	const isApiErrorWithCode = record?.errorCode === TWO_FACTOR_REQUIRED_CODE;
	if (isApiErrorWithCode && details) {
		return challengeFrom(details, stringOf(record?.message));
	}
	const body = bodyOf(error);
	if (body?.code !== TWO_FACTOR_REQUIRED_CODE) {
		return null;
	}
	return challengeFrom(body, stringOf(body.message));
}

function challengeFrom(source: UnknownRecord, message: string | null): ITwoFactorChallenge | null {
	const challenge = stringOf(source.challenge);
	if (!challenge) {
		return null;
	}
	const expiresAt = stringOf(source.expiresAt) ?? '';
	if (message) {
		return { challenge, expiresAt, message };
	}
	return { challenge, expiresAt };
}

/** The digits of a typed or pasted code, six at most. */
export function authenticatorCodeOf(value: string): string {
	return value.replace(/\D/g, '').slice(0, TWO_FACTOR_CODE_LENGTH);
}

export function isAuthenticatorCode(value: string): boolean {
	return new RegExp(`^\\d{${TWO_FACTOR_CODE_LENGTH}}$`).test(value);
}

/** A recovery code as the API writes it: upper case, letters, digits and dashes. */
export function recoveryCodeOf(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function isRecoveryCode(value: string): boolean {
	const characters = value.replace(/-/g, '');
	return characters.length >= RECOVERY_CODE_MIN_CHARACTERS;
}

/** The seconds a 429 asks to wait (its body's `retryAfter`, else its `Retry-After` header), or null. */
export function retryAfterSecondsOf(error: unknown): number | null {
	if (httpStatusOf(error) !== 429) {
		return null;
	}
	const record = recordOf(error);
	const details = recordOf(record?.details);
	const body = bodyOf(error);
	const fromBody = details?.retryAfter ?? body?.retryAfter;
	if (typeof fromBody === 'number' && fromBody > 0) {
		return fromBody;
	}
	const response = recordOf(record?.response);
	const headers = recordOf(response?.headers);
	const fromHeader = Number(headers?.['retry-after']);
	if (Number.isFinite(fromHeader) && fromHeader > 0) {
		return fromHeader;
	}
	return null;
}

/** Whole minutes to wait, one at least. */
export function retryMinutesOf(seconds: number): number {
	return Math.max(1, Math.ceil(seconds / 60));
}

/** The secret in groups of four, easier to type into an app by hand. */
export function secretGroupsOf(secret: string): string {
	return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

/** The text of the downloaded recovery codes: a heading, then one code a line. */
export function recoveryCodesFileText({ codes, heading }: { codes: string[]; heading: string }): string {
	return [heading, '', ...codes, ''].join('\n');
}

/**
 * Why the person's two-factor state could not be read: an API without these routes (`unsupported`: the settings
 * offer nothing, as before) or any other failure (`error`: the page says so and offers to try again).
 */
export function twoFactorStatusFailureOf(error: unknown): 'unsupported' | 'error' {
	if (httpStatusOf(error) === 404) {
		return 'unsupported';
	}
	return 'error';
}

/** Why the code step of a sign-in failed, for the message it shows. */
export type TwoFactorSignInFailure =
	| { kind: 'wrong-code' }
	| { kind: 'expired' }
	| { kind: 'too-many'; minutes: number | null }
	| { kind: 'failed' };

/**
 * Why the code step of a sign-in failed. The API answers a wrong code and a sign-in that waited too long alike (401):
 * a 401 while the challenge lasts is a wrong code, and one after it ended asks to sign in again.
 */
export function twoFactorSignInFailureOf(error: unknown, expiresAt: string, now: number): TwoFactorSignInFailure {
	const status = httpStatusOf(error);
	if (status === 429) {
		const seconds = retryAfterSecondsOf(error);
		if (seconds === null) {
			return { kind: 'too-many', minutes: null };
		}
		return { kind: 'too-many', minutes: retryMinutesOf(seconds) };
	}
	if (status === 401) {
		const expiry = Date.parse(expiresAt);
		const hasEnded = Number.isFinite(expiry) && now >= expiry;
		if (hasEnded) {
			return { kind: 'expired' };
		}
		return { kind: 'wrong-code' };
	}
	if (status === 400) {
		return { kind: 'wrong-code' };
	}
	return { kind: 'failed' };
}

/** Why a change of the person's own two-factor settings failed, for the message it shows. */
export type TwoFactorWriteFailure =
	| { kind: 'wrong-code' }
	| { kind: 'too-many'; minutes: number | null }
	| { kind: 'unavailable' }
	| { kind: 'changed' }
	| { kind: 'failed' };

/**
 * Why a change of the settings failed: a code that was refused (401, or 400 for its format), too many codes (429),
 * a server that cannot keep secrets (503), a state changed meanwhile (409), or anything else.
 */
export function twoFactorWriteFailureOf(error: unknown): TwoFactorWriteFailure {
	const status = httpStatusOf(error);
	if (status === 429) {
		const seconds = retryAfterSecondsOf(error);
		if (seconds === null) {
			return { kind: 'too-many', minutes: null };
		}
		return { kind: 'too-many', minutes: retryMinutesOf(seconds) };
	}
	if (status === 401 || status === 400) {
		return { kind: 'wrong-code' };
	}
	if (status === 503) {
		return { kind: 'unavailable' };
	}
	if (status === 409) {
		return { kind: 'changed' };
	}
	return { kind: 'failed' };
}

/** A typed proof: six digits are a code of the app, anything longer a recovery code. */
export function twoFactorProofOf(value: string): { code: string } | { recoveryCode: string } | null {
	const digits = authenticatorCodeOf(value);
	const isDigitsOnly = value.replace(/\s/g, '') === digits;
	if (isDigitsOnly && isAuthenticatorCode(digits)) {
		return { code: digits };
	}
	const recoveryCode = recoveryCodeOf(value);
	if (isRecoveryCode(recoveryCode)) {
		return { recoveryCode };
	}
	return null;
}

/** Settings > Security, where the person turns two-factor authentication on. */
export const TWO_FACTOR_SETTINGS_PATH = '/settings/personal/security';

/**
 * Whether a workspace sign-in's answer (`{ data: { loginResponse } }`, in both modes) says the organization asks this
 * person to turn two-factor authentication on (`twoFactorSetupRequired`, set only when the organization requires it).
 */
export function asksTwoFactorSetup(answer: unknown): boolean {
	const data = recordOf(recordOf(answer)?.data);
	const loginResponse = recordOf(data?.loginResponse);
	return loginResponse?.twoFactorSetupRequired === true;
}
