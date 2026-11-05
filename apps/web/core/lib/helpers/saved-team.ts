import { getActiveTeamIdCookie } from './cookies';

/**
 * The team picked on a previous visit is still being loaded: a page that scopes its data to the active team waits
 * for it rather than showing every team's data first, then narrowing the list under the user's eyes.
 */
export function isSavedTeamLoading(hasActiveTeam: boolean) {
	if (hasActiveTeam) {
		return false;
	}
	const savedTeamId = getActiveTeamIdCookie();
	return Boolean(savedTeamId);
}
