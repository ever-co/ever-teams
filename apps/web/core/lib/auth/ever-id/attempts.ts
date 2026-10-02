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

/** One attempt: its verdict, and how to give it back once the API did not judge it. */
interface Attempt {
	verdict: AttemptVerdict;
	/** Gives this attempt back (the minimum interval still applies); a no-op for an attempt that did not go ahead. */
	giveBack: () => void;
}

const NOTHING_TO_GIVE_BACK = () => undefined;

interface AttemptEntry {
	used: number;
	resetAt: number;
	lastAt: number;
}

interface AttemptBudgetOptions {
	limit: number;
	windowMs: number;
	/** The least time between two attempts with one key (0: none). */
	minIntervalMs?: number;
	maxEntries?: number;
	now?: () => number;
}

export class AttemptBudget {
	private readonly entries = new Map<string, AttemptEntry>();
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
	take(key: string): Attempt {
		const id = AttemptBudget.idOf(key);
		const now = this.now();
		let entry = this.entries.get(id);
		if (entry && entry.resetAt > now) {
			if (entry.used >= this.limit) return { verdict: 'exhausted', giveBack: NOTHING_TO_GIVE_BACK };
			if (now - entry.lastAt < this.minIntervalMs) return { verdict: 'too_soon', giveBack: NOTHING_TO_GIVE_BACK };
			entry.used += 1;
			entry.lastAt = now;
		} else {
			this.entries.delete(id);
			this.makeRoom(now);
			entry = { used: 1, resetAt: now + this.windowMs, lastAt: now };
			this.entries.set(id, entry);
		}
		return { verdict: 'ok', giveBack: this.giveBackTo(id, entry) };
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

/**
 * Gauzy's one-time e-mail code: five tries per key like the API itself, at most one every 15 s (the API allows five
 * per minute and address).
 */
export const everIdConfirmAttempts = new AttemptBudget({ limit: 5, windowMs: 15 * 60_000, minIntervalMs: 15_000 });

/** Reading the sign-up confirmation (each visit of the page reads it once). */
export const everIdPrefillAttempts = new AttemptBudget({ limit: 10, windowMs: 30 * 60_000 });

/** Submitting the sign-up: at most one every 20 s (the API allows three per minute and address). */
export const everIdSignupAttempts = new AttemptBudget({ limit: 5, windowMs: 30 * 60_000, minIntervalMs: 20_000 });
