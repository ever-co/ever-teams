import { createHash } from 'node:crypto';

/** The longest a session check is reused for, whatever the setting says. */
export const SESSION_CHECK_MEMO_MAX_TTL_MS = 60_000;

/** How long a session check is reused for when SESSION_CHECK_MEMO_TTL_MS is unset. */
export const SESSION_CHECK_MEMO_DEFAULT_TTL_MS = 5_000;

/**
 * The reuse window, from `SESSION_CHECK_MEMO_TTL_MS`: milliseconds, `0` (or `false`) turns the reuse off, anything
 * else or nothing is the default, and no value exceeds the cap.
 *
 * @param raw The environment value.
 */
export function resolveSessionCheckMemoTtl(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === '') return SESSION_CHECK_MEMO_DEFAULT_TTL_MS;
	if (raw.trim().toLowerCase() === 'false') return 0;
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 0) return SESSION_CHECK_MEMO_DEFAULT_TTL_MS;
	return Math.min(value, SESSION_CHECK_MEMO_MAX_TTL_MS);
}

interface Entry<T> {
	readonly until: number;
	readonly answer: Promise<T>;
}

/**
 * Reuses the answer of a session check (`GET /user/me` on the Gauzy API) for the same access token for a short while.
 *
 * Every `app/api/*` route checks the caller's token against the Gauzy API before it forwards the request, and a
 * page load or a timer click sends several such routes within a second, each paying that round trip (and, on a
 * deployment whose server-side calls leave the cluster, the whole network path) before its own work starts. Within
 * the window the routes share one check: concurrent routes share the check in flight, later ones its answer.
 *
 * Only an answer that authenticated is kept — a refusal, an outage or an empty answer is forgotten as soon as it is
 * known, so the next route checks again. The Gauzy API itself reuses a validated token for ten seconds
 * (`JWT_AUTHENTICATED_USER_TTL_MS`), so a token revoked meanwhile is refused there on the same schedule as before.
 * Tokens are keyed by their hash: the map never holds a token.
 */
export class SessionCheckMemo<T> {
	private readonly entries = new Map<string, Entry<T>>();

	/**
	 * @param ttlMs How long an answer is reused; `0` reuses nothing.
	 * @param maxEntries How many tokens are remembered at once; the oldest entries go first.
	 * @param now The clock (tests pass their own).
	 */
	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries: number = 2_000,
		private readonly now: () => number = Date.now
	) {}

	/**
	 * The answer for a token: a kept one, the one in flight, or a fresh check.
	 *
	 * @param token The access token.
	 * @param check Runs the session check.
	 * @param isKeepable Whether an answer authenticated and may be reused.
	 */
	answer(token: string, check: () => Promise<T>, isKeepable: (answer: T) => boolean): Promise<T> {
		if (this.ttlMs <= 0 || !token) {
			return check();
		}

		const key = createHash('sha256').update(token).digest('base64url');
		const now = this.now();
		const existing = this.entries.get(key);
		if (existing && existing.until > now) {
			return existing.answer;
		}

		const answer = check().then(
			(result) => {
				if (!isKeepable(result)) this.forget(key, answer);
				return result;
			},
			(error) => {
				this.forget(key, answer);
				throw error;
			}
		);
		// A rejection reaches every caller that awaits `answer`; this handler only keeps a check nobody awaits any
		// more from being reported as unhandled.
		answer.catch(() => undefined);
		this.entries.set(key, { until: now + this.ttlMs, answer });
		this.evict(now);
		return answer;
	}

	/** Drops every kept answer. */
	clear(): void {
		this.entries.clear();
	}

	/** How many tokens are remembered. */
	get size(): number {
		return this.entries.size;
	}

	private forget(key: string, answer: Promise<T>): void {
		// Only this check's own entry: a newer check for the same token may have replaced it.
		if (this.entries.get(key)?.answer === answer) {
			this.entries.delete(key);
		}
	}

	private evict(now: number): void {
		for (const [key, entry] of this.entries) {
			if (entry.until <= now) this.entries.delete(key);
		}
		// Insertion order is age order: the first entries are the oldest.
		for (const key of this.entries.keys()) {
			if (this.entries.size <= this.maxEntries) break;
			this.entries.delete(key);
		}
	}
}
