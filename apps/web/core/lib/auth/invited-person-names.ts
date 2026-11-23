/** The first and last name an account opened from an invitation code starts with. */
export type InvitedPersonNames = { firstName: string; lastName: string };

/**
 * The names of the account that an invitation code typed on the sign-in page opens. That step asks for no name and an
 * invitation sent from the Invite dialog carries none, while the app needs a name to load the person's workspace: the
 * account then takes the start of the invited address, the name the accept page shows until one is typed. The person
 * can change it in their profile.
 */
export function invitedPersonNames(fullName: string | null | undefined, email: string): InvitedPersonNames {
	const invitedName = fullName?.trim();
	if (invitedName) {
		const names = invitedName.split(' ');
		return { firstName: names[0], lastName: names[1] || '' };
	}

	const [localPart] = email.trim().split('@');
	return { firstName: localPart ?? '', lastName: '' };
}
