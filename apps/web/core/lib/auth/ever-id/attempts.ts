import { createHash } from 'node:crypto';

/**
 * Attempt budgets per one-time key for the Ever ID steps that call the Gauzy API (kept per process; each replica
 * keeps its own).
 *
 * The API limits each key per minute (and every address, this server's included, more loosely). The budgets here
 * stay just below the API's per-key limits, so a browser repeating a step is answered by this server (429 with a
 * Retry-After) before the API has to refuse it. An attempt the API did not judge (it could not be reached, timed out,
 * was busy, limited the rate or failed) is given back. Keys are kept hashed, never as such.
 */

/** One attempt: whether it may go ahead, when to try again otherwise, and how to give it back. */
interface Attempt {
	allowed: boolean;
	/** Seconds until the key's window starts again (when not allowed). */
	retryAfterS: number;
	/** Gives this attempt back; a no-op for an attempt that did not go ahead or was already given back. */
	giveBack: () => void;
}

interface AttemptEntry {
	used: number;
	resetAt: number;
}

interface AttemptBudgetOptions {
	limit: number;
	windowMs: number;
	maxEntries?: number;
	now?: () => number;
}

const NOTHING_TO_GIVE_BACK = () => undefined;

export class AttemptBudget {
	private readonly entries = new Map<string, AttemptEntry>();
	private readonly limit: number;
	private readonly windowMs: number;
	private readonly maxEntries: number;
	private readonly now: () => number;

	constructor(options: AttemptBudgetOptions) {
		this.limit = options.limit;
		this.windowMs = options.windowMs;
		this.maxEntries = options.maxEntries ?? 10_000;
		this.now = options.now ?? (() => Date.now());
	}

	/** Counts one attempt with `key` when the key has some left in its current window. */
	take(key: string): Attempt {
		const id = AttemptBudget.idOf(key);
		const now = this.now();
		let entry = this.entries.get(id);
		if (entry && entry.resetAt > now) {
			if (entry.used >= this.limit) {
				return {
					allowed: false,
					retryAfterS: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
					giveBack: NOTHING_TO_GIVE_BACK
				};
			}
			entry.used += 1;
		} else {
			this.entries.delete(id);
			this.makeRoom(now);
			entry = { used: 1, resetAt: now + this.windowMs };
			this.entries.set(id, entry);
		}
		return { allowed: true, retryAfterS: 0, giveBack: this.giveBackTo(id, entry) };
	}

	/** Gives an attempt back to the entry that counted it, never to one that replaced it since. */
	private giveBackTo(id: string, entry: AttemptEntry): () => void {
		let given = false;
		return () => {
			if (given || this.entries.get(id) !== entry || entry.used === 0) return;
			given = true;
			entry.used -= 1;
		};
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

const MINUTE_MS = 60_000;

/** Gauzy's one-time e-mail code: 4 a minute (the API allows 5 a minute per key, and five wrong codes in all). */
export const everIdConfirmAttempts = new AttemptBudget({ limit: 4, windowMs: MINUTE_MS });

/** Reading the sign-up confirmation: 9 a minute (the API allows 10). */
export const everIdPrefillAttempts = new AttemptBudget({ limit: 9, windowMs: MINUTE_MS });

/** Submitting the sign-up: 4 a minute (the API allows 5). */
export const everIdSignupAttempts = new AttemptBudget({ limit: 4, windowMs: MINUTE_MS });

/**
 * Finishing the setup of a workspace without a tenant, per workspace token: 3 a minute. Each attempt starts with the
 * API's workspace sign-in, whose per-address limit this server shares with everyone signing up here.
 */
export const everIdSetupAttempts = new AttemptBudget({ limit: 3, windowMs: MINUTE_MS });
