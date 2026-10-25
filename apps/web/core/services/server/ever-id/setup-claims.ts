import { createHash } from 'node:crypto';

/**
 * Accounts whose Ever ID setup is running in this process (hashed user ids; the workspace token when the session names
 * no user): two overlapping setups of one account would both find no team and both create one. Two sign-ins of one
 * account carry different workspace tokens, so the token alone would not tell them apart. Each replica keeps its own
 * set.
 */
const runningSetups = new Set<string>();

/**
 * Claims the setup of one account in this process: answers the function that releases the claim, or `null` while
 * another setup of the same account runs here. The check and the claim are one synchronous step, so two requests can
 * never both pass it.
 */
export function claimEverIdSetup(target: { userId?: string; token: string }): (() => void) | null {
	const key = createHash('sha256')
		.update(target.userId ? `user:${target.userId}` : `token:${target.token}`)
		.digest('hex');
	if (runningSetups.has(key)) return null;
	runningSetups.add(key);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		runningSetups.delete(key);
	};
}
