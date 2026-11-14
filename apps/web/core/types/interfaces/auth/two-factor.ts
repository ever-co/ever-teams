/**
 * Two-factor authentication with an authenticator app (Gauzy `/api/auth/two-factor/*`, ever-co/ever-gauzy#11916).
 * Off for every account until its owner turns it on.
 */

/** The `code` of the 403 a sign-in answers instead of a session when the account asks for a second factor. */
export const TWO_FACTOR_REQUIRED_CODE = 'TWO_FACTOR_REQUIRED';

/** `GET /auth/two-factor`: the signed-in person's own state. */
export interface ITwoFactorStatus {
	/** Whether the server can keep authenticator secrets (it needs its encryption key). */
	available: boolean;
	/** Whether sign-ins ask for a code. */
	enabled: boolean;
	/** When it was turned on. */
	enabledAt: string | null;
	/** Whether a setup was started and still waits for its first code. */
	pendingEnrollment: boolean;
	/** How many recovery codes are still unused. */
	recoveryCodesLeft: number;
	/** Whether the organization of this session asks its members to turn it on. */
	requiredByOrganization: boolean;
}

/** `POST /auth/two-factor/enroll`: the secret, as text and as an `otpauth://` address. */
export interface ITwoFactorEnrollment {
	secret: string;
	otpauthUrl: string;
}

/** A proof of the second factor: a current six-digit code, or one of the recovery codes. */
export interface ITwoFactorProof {
	code?: string;
	recoveryCode?: string;
}

/** The recovery codes answered once, when it is turned on or when they are replaced. */
export interface ITwoFactorRecoveryCodes {
	recoveryCodes: string[];
}

/** `POST /auth/two-factor/confirm`. */
export interface ITwoFactorConfirmation extends ITwoFactorRecoveryCodes {
	enabledAt: string;
}

/** What a sign-in answered instead of a session: the challenge to send back with the code. */
export interface ITwoFactorChallenge {
	challenge: string;
	/** When the challenge stops being accepted (ISO 8601). */
	expiresAt: string;
	/** The API's own explanation, shown by apps that cannot ask for the code. */
	message?: string;
}

/** `POST /auth/two-factor/verify`. */
export interface ITwoFactorVerifyInput extends ITwoFactorProof {
	challenge: string;
}
