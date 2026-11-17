import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';

/**
 * The team this browser last opened, kept in local storage for its next start (`LAST_WORKSPACE_AND_TEAM`).
 *
 * Storage is a convenience here: the team cookie already names the team, and the session follows the cookies. The
 * browser may refuse it (storage blocked, a private window, a full quota), and reading `localStorage` can then throw as
 * well as writing to it. A team, organization or workspace switch must still finish as a whole, so neither function
 * throws: a switch that stopped at the storage write left the cookies on the new organization while the session token
 * stayed on the old one (Greptile on ever-co/ever-teams#5345).
 */

/** The team this browser last opened, or null when none is kept or the browser refuses its storage. */
export function readLastOpenedTeamId(): string | null {
	try {
		return globalThis.window?.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) || null;
	} catch {
		return null;
	}
}

/**
 * Keeps `teamId` for this browser's next start. It never throws. False means only that the team was not kept (no
 * browser, or storage refused), never that the switch failed: callers go on with the switch either way.
 */
export function storeLastOpenedTeamId(teamId: string): boolean {
	try {
		const storage = globalThis.window?.localStorage;
		if (!storage) return false;
		storage.setItem(LAST_WORKSPACE_AND_TEAM, teamId);
		return true;
	} catch {
		// The team cookie is enough to open the team
		return false;
	}
}
