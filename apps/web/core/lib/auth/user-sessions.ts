import { errorStatusOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';

/**
 * The signed-in user's sessions, as Gauzy lists them (`GET /auth/sessions`, ever-co/ever-gauzy#11943): each sign-in,
 * on each device or app, until it is signed out or expires. Personal API tokens are not sessions.
 */

/** The kind of app a session was opened from, as far as its user agent tells. */
export type TUserSessionApp = 'WEB' | 'DESKTOP' | 'MOBILE' | 'UNKNOWN';

export interface IUserSession {
	/** Names the session in `DELETE /auth/sessions/:id`. */
	id: string;
	/** True for the session of this browser. */
	current: boolean;
	app: TUserSessionApp;
	/** The browser and its major version ("Chrome 131"), when the user agent names one. */
	browser: string | null;
	/** The operating system ("Windows", "macOS", "Android"), when the user agent names one. */
	os: string | null;
	userAgent: string | null;
	ipAddress: string | null;
	/** ISO 8601. */
	signedInAt: string;
	/** ISO 8601, accurate to a few minutes. */
	lastActiveAt: string;
}

/**
 * The proof that the person at this session owns the account: its password, or for an account without one the code
 * of the sign-in code e-mail.
 */
export interface IUserSessionSignOutOthersInput {
	password?: string;
	code?: string;
}

export interface IUserSessionSignOutOthersResponse {
	/** How many sessions were signed out. */
	signedOut: number;
}

/** Gauzy's codes for a refused session request (`{ code, message }` bodies). */
export const USER_SESSION_REFUSAL = {
	/** The session of the request itself: it signs out with Sign out instead. */
	CURRENT: 'SESSION_IS_CURRENT',
	/** This browser's token was minted before sessions were named: a new sign-in names it. */
	CURRENT_UNKNOWN: 'SESSION_UNKNOWN',
	/** The proof sent is not the kind the account needs (a password for an account without one, or no proof). */
	CONFIRMATION_REQUIRED: 'SESSION_CONFIRMATION_REQUIRED',
	/** The password or the code is wrong, or the code expired: nobody was signed out. */
	CONFIRMATION_INVALID: 'SESSION_CONFIRMATION_INVALID',
	/** A session kept renewing its tokens while it was signed out: trying again finishes it. */
	SIGN_OUT_INCOMPLETE: 'SESSION_SIGN_OUT_INCOMPLETE',
	/** A session older than the list cannot be signed out alone, only with all the others. */
	UNNAMED: 'SESSION_UNNAMED'
} as const;

/** How the person proves they own the account before the other sessions are signed out. */
export type TSessionProof = 'password' | 'code';

/** What a session's row names: the browser (and its system), the app, or nothing known. */
export type TSessionDevice =
	| { kind: 'browser'; browser: string; os: string | null }
	| { kind: 'app'; app: 'DESKTOP' | 'MOBILE'; os: string | null }
	| { kind: 'unknown' };

/** The device a session's row draws. */
export type TSessionDeviceKind = 'phone' | 'computer' | 'unknown';

const NOT_FOUND = 404;

const PHONE_SYSTEMS = /^(ios|ipados|android)\b/i;

function timeOf(value: string): number {
	const time = new Date(value).getTime();
	if (Number.isNaN(time)) {
		return 0;
	}
	return time;
}

function trimmedOrNull(value: string | null): string | null {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

/** This browser's session first, then the others from the most recently active; the list given is left as it is. */
export function sessionsInOrder(sessions: readonly IUserSession[]): IUserSession[] {
	return [...sessions].sort((first, second) => {
		if (first.current) {
			return -1;
		}
		if (second.current) {
			return 1;
		}
		return timeOf(second.lastActiveAt) - timeOf(first.lastActiveAt);
	});
}

export function deviceOf(session: IUserSession): TSessionDevice {
	const browser = trimmedOrNull(session.browser);
	const os = trimmedOrNull(session.os);
	if (browser) {
		return { kind: 'browser', browser, os };
	}
	if (session.app === 'DESKTOP' || session.app === 'MOBILE') {
		return { kind: 'app', app: session.app, os };
	}
	return { kind: 'unknown' };
}

export function deviceKindOf(session: IUserSession): TSessionDeviceKind {
	const device = deviceOf(session);
	if (device.kind === 'unknown') {
		return 'unknown';
	}
	const isMobileApp = session.app === 'MOBILE';
	const isPhoneSystem = device.os !== null && PHONE_SYSTEMS.test(device.os);
	if (isMobileApp || isPhoneSystem) {
		return 'phone';
	}
	return 'computer';
}

/**
 * The proof to ask for after a refused sign-out: Gauzy refuses the wrong kind of proof with
 * `SESSION_CONFIRMATION_REQUIRED` (a password for an account without one, a code for an account with one), so the
 * other kind is asked; any other failure keeps the proof the person was giving.
 */
export function nextProofAfter(proof: TSessionProof, error: unknown): TSessionProof {
	if (gauzyErrorCodeOf(error) !== USER_SESSION_REFUSAL.CONFIRMATION_REQUIRED) {
		return proof;
	}
	if (proof === 'password') {
		return 'code';
	}
	return 'password';
}

/** Whether the API has no sessions route (a Gauzy before ever-co/ever-gauzy#11943): the section is then not shown. */
export function isSessionsUnavailable(error: unknown): boolean {
	return errorStatusOf(error) === NOT_FOUND;
}
