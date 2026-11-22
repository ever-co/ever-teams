/**
 * An invitation code typed on the sign-in page is accepted for a new address only. When the address already has an
 * account, Gauzy refuses the acceptance with a 409: the person signs in to that account, then accepts the invitation
 * from their home (ever-co/ever-gauzy#12147).
 */
const EXISTING_ACCOUNT_STATUS = 409;

/** What a sign-in route adds to its answer for that refusal, so the page says it in the person's language. */
export const SIGN_IN_FIRST_CODE = 'INVITE_EXISTING_ACCOUNT_SIGN_IN_FIRST';

/** The message of that refusal, for a reader of the route's answer that knows no code. */
export const SIGN_IN_FIRST_MESSAGE =
	'This email already has an account. Sign in to it, then accept the invitation from your home.';

/** What a sign-in route says for any other refused acceptance. */
export const INVALID_CODE_OR_EMAIL_MESSAGE = 'Authentication code or email address invalid';

export interface InviteAcceptRefusalAnswer {
	errors: { email: string };
	code?: string;
}

/** Whether Gauzy's refusal of an acceptance says the address already has an account. */
export function isExistingAccountRefusal(refusalBody: unknown): boolean {
	const hasBody = typeof refusalBody === 'object' && refusalBody !== null;
	if (!hasBody) {
		return false;
	}
	const statusCode = (refusalBody as { statusCode?: unknown }).statusCode;
	return statusCode === EXISTING_ACCOUNT_STATUS;
}

/**
 * What a sign-in route answers when Gauzy refused to accept the invitation its code matched.
 *
 * @param refusalBody Gauzy's error body, or nothing when the request itself failed.
 */
export function inviteAcceptRefusalAnswer(refusalBody: unknown): InviteAcceptRefusalAnswer {
	if (isExistingAccountRefusal(refusalBody)) {
		return { errors: { email: SIGN_IN_FIRST_MESSAGE }, code: SIGN_IN_FIRST_CODE };
	}
	return { errors: { email: INVALID_CODE_OR_EMAIL_MESSAGE } };
}

/** Whether a sign-in route's answer carries the code of that refusal. */
export function carriesSignInFirstCode(answer: unknown): boolean {
	const hasAnswer = typeof answer === 'object' && answer !== null;
	if (!hasAnswer) {
		return false;
	}
	return (answer as { code?: unknown }).code === SIGN_IN_FIRST_CODE;
}
