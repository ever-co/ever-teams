import { createHash } from 'node:crypto';

/**
 * Attempt budgets per one-time key for the Ever ID steps that call the Gauzy API (kept per process; each replica
 * keeps its own).
 *
 * The API limits its Ever ID routes per client address, and every request of this app reaches it from this
 * server: one browser repeating a step could use up what every other person shares. Each key therefore gets a
 * number of attempts and, for the steps the API limits most, a minimum interval between two attempts, so one key
 * stays below the API's own per-address rate. An attempt the API did not judge (it could not be reached, timed out,
 * limited the rate or failed) is given back. Keys are kept hashed, never as such.
 */

/** `ok`: go ahead; `exhausted`: the key used its attempts; `too_soon`: wait before the next attempt. */
type AttemptVerdict = 'ok' | 'exhausted' | 'too_soon';

interface AttemptBudgetOptions {
	limit: number;
	windowMs: number;
	/** The least time between two attempts with one key (0: none). */
	minIntervalMs?: number;
	maxEntries?: number;
	now?: () => number;
}

export class AttemptBudget {
	private readonly entries = new Map<string, { used: number; resetAt: number; lastAt: number }>();
	private readonly limit: number;
	private readonly windowMs: number;
	private readonly minIntervalMs: number;
	private readonly maxEntries: number;
	private readonly now: () => number;

	constructor(options: AttemptBudgetOptions) {
		this.limit = options.limit;
		this.windowMs = options.windowMs;
		this.minIntervalMs = options.minIntervalMs ?? 0;
		this.maxEntries = options.maxEntries ?? 10_000;
		this.now = options.now ?? (() => Date.now());
	}

	/** Counts one attempt with `key` when it may go ahead. */
	take(key: string): AttemptVerdict {
		const id = AttemptBudget.idOf(key);
		const now = this.now();
		const entry = this.entries.get(id);
		if (entry && entry.resetAt > now) {
			if (entry.used >= this.limit) return 'exhausted';
			if (now - entry.lastAt < this.minIntervalMs) return 'too_soon';
			entry.used += 1;
			entry.lastAt = now;
			return 'ok';
		}
		this.entries.delete(id);
		this.makeRoom(now);
		this.entries.set(id, { used: 1, resetAt: now + this.windowMs, lastAt: now });
		return 'ok';
	}

	/** Gives back the last attempt with `key`: the API did not judge it (the minimum interval still applies). */
	giveBack(key: string): void {
		const entry = this.entries.get(AttemptBudget.idOf(key));
		if (entry && entry.used > 0) entry.used -= 1;
	}

	private static idOf(key: string): string {
		return createHash('sha256').update(key).digest('base64url');
	}

	/** Entries are kept in insertion order, which is also expiry order: drop the expired ones, then the oldest. */
	private makeRoom(now: number): void {
		for (const [id, entry] of this.entries) {
			if (entry.resetAt > now && this.entries.size < this.maxEntries) break;
			this.entries.delete(id);
		}
	}
}

/**
 * Gauzy's one-time e-mail code: five tries per key like the API itself, at most one every 15 s (the API allows five
 * per minute and address).
 */
export const everIdConfirmAttempts = new AttemptBudget({ limit: 5, windowMs: 15 * 60_000, minIntervalMs: 15_000 });

/** Reading the sign-up confirmation (each visit of the page reads it once). */
export const everIdPrefillAttempts = new AttemptBudget({ limit: 10, windowMs: 30 * 60_000 });

/** Submitting the sign-up: at most one every 20 s (the API allows three per minute and address). */
export const everIdSignupAttempts = new AttemptBudget({ limit: 5, windowMs: 30 * 60_000, minIntervalMs: 20_000 });
