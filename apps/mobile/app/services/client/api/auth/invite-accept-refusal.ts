/**
 * An invitation code typed on the sign-in screen is accepted for a new address only. When the address already has an
 * account, Gauzy refuses the acceptance with a 409: the person signs in to that account, then accepts the invitation
 * from the app (ever-co/ever-gauzy#12147).
 */
const EXISTING_ACCOUNT_STATUS = 409;

const SIGN_IN_FIRST_KEY = 'loginScreen.errors.existingAccountSignInFirst';
const INVALID_CODE_KEY = 'loginScreen.errors.invalidCode';

/**
 * The message key for an invitation acceptance Gauzy refused.
 *
 * @param status The status of Gauzy's answer; none when the request itself failed.
 */
export function inviteAcceptRefusalKey(status: number | undefined) {
	const hasExistingAccount = status === EXISTING_ACCOUNT_STATUS;
	if (hasExistingAccount) {
		return SIGN_IN_FIRST_KEY;
	}
	return INVALID_CODE_KEY;
}
