/**
 * What a sign-out of this tab clears besides the cookies and the query cache: a feature that keeps something of the
 * signed-in person in memory (unsaved Docs text, for one) registers its cleanup here, and both the person's own
 * sign-out and a forced one (the session expired) run them. Nothing here imports a feature, so the auth code stays
 * free of their modules.
 */
const cleanups = new Set<() => void>();

/** Registers a cleanup run on every sign-out of this tab; answers the function that removes it. */
export function onSignOut(cleanup: () => void): () => void {
	cleanups.add(cleanup);
	return () => {
		cleanups.delete(cleanup);
	};
}

/** Runs every registered cleanup; one that throws does not stop the others, nor the sign-out. */
export function runSignOutCleanups(): void {
	for (const cleanup of [...cleanups]) {
		try {
			cleanup();
		} catch {
			// A cleanup's failure is its own: the sign-out goes on.
		}
	}
}
