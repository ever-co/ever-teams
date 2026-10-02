import { createHash } from 'node:crypto';

/**
 * Attempt budgets per one-time key for the Ever ID steps that call the Gauzy API (kept per process).
 *
 * The API limits its Ever ID routes per client address, and every request of this app reaches it from this
 * server: one browser repeating a step could use up what every other person shares. A key that used its budget is
 * answered 429 here, without calling the API. Keys are kept hashed, never as such.
 */
export class AttemptBudget {
	private readonly entries = new Map<string, { used: number; resetAt: number }>();

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
		private readonly maxEntries = 10_000,
		private readonly now: () => number = Date.now
	) {}

	/** Counts one attempt with `key`; `false` once the key has used its budget for the current window. */
	take(key: string): boolean {
		const id = createHash('sha256').update(key).digest('base64url');
		const now = this.now();
		const entry = this.entries.get(id);
		if (entry && entry.resetAt > now) {
			if (entry.used >= this.limit) return false;
			entry.used += 1;
			return true;
		}
		this.entries.delete(id);
		this.makeRoom(now);
		this.entries.set(id, { used: 1, resetAt: now + this.windowMs });
		return true;
	}

	/** Entries are kept in insertion order, which is also expiry order: drop the expired ones, then the oldest. */
	private makeRoom(now: number): void {
		for (const [id, entry] of this.entries) {
			if (entry.resetAt > now && this.entries.size < this.maxEntries) break;
			this.entries.delete(id);
		}
	}
}

/** Gauzy's one-time e-mail code: the API itself allows five tries per key. */
export const everIdConfirmAttempts = new AttemptBudget(5, 15 * 60_000);

/** Reading the sign-up confirmation (each visit of the page reads it once). */
export const everIdPrefillAttempts = new AttemptBudget(10, 30 * 60_000);

/** Submitting the sign-up. */
export const everIdSignupAttempts = new AttemptBudget(5, 30 * 60_000);
