/**
 * The team a solo sign-up creates (Gauzy needs one), named after the person. The sign-up screen shows the same name
 * in its preview, so both read it from here.
 */
export function defaultTeamNameOf(userName: string): string {
	const trimmedName = userName.trim();
	if (!trimmedName) {
		return 'My Team';
	}
	return `${trimmedName}'s Team`;
}
