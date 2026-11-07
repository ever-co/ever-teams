import { createHash } from 'node:crypto';

/** The longest a session check is reused for, whatever the setting says. */
export const SESSION_CHECK_MEMO_MAX_TTL_MS = 60_000;

/** How long a session check is reused for when SESSION_CHECK_MEMO_TTL_MS is unset. */
export const SESSION_CHECK_MEMO_DEFAULT_TTL_MS = 5_000;

/** How long a session check may take before its callers are answered with its failure and it is forgotten. */
export const SESSION_CHECK_DEADLINE_MS = 15_000;

/** The failure a check that overran its deadline is answered with. */
export class SessionCheckTimeoutError extends Error {
	constructor(deadlineMs: number) {
		super(`The session check did not answer within ${deadlineMs} ms`);
		this.name = 'SessionCheckTimeoutError';
	}
}

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

/**
 * When a JWT stops being valid (its `exp` claim, as a time in milliseconds), or `undefined` for a token that
 * states none or is not a JWT. Read without verification: only the Gauzy API verifies the token, this only
 * stops an answer from outliving the token it was given for.
 *
 * @param token The access token.
 */
export function tokenExpiresAt(token: string): number | undefined {
	const parts = token.split('.');
	if (parts.length !== 3) return undefined;
	try {
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { exp?: unknown };
		return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : undefined;
	} catch {
		return undefined;
	}
}

/** Runs a session check; the signal is aborted when the check's deadline passes. */
export type SessionCheckRunner<T> = (signal: AbortSignal) => Promise<T>;

interface Entry<T> {
	/** When the answer stops being reused (never past the token's own expiry). */
	readonly until: number;
	/** Set once the check is started, right after the entry is created (the settle handlers refer to the entry). */
	answer: Promise<T>;
	/** Whether the check has answered; a check still in flight is shared until it does, whatever `until` says. */
	settled: boolean;
}

/**
 * Reuses the answer of a session check (`GET /user/me` on the Gauzy API) for the same access token for a short while.
 *
 * Every `app/api/*` route checks the caller's token against the Gauzy API before it forwards the request, and a
 * page load or a timer click sends several such routes within a second, each paying that round trip (and, on a
 * deployment whose server-side calls leave the cluster, the whole network path) before its own work starts. Within
 * the window the routes share one check: concurrent routes share the check in flight (for as long as it takes),
 * later ones its answer.
 *
 * Only an answer that authenticated is kept — a refusal, an outage or an empty answer is forgotten as soon as it is
 * known, so the next route checks again. An answer is never reused past the token's own expiry (`exp`). A token
 * revoked meanwhile (user deactivated, password changed) is refused once the Gauzy API refuses it, which is itself
 * up to `JWT_AUTHENTICATED_USER_TTL_MS` (10 s there by default) after the revocation, plus this window: a route that
 * must not act on a token revoked seconds ago asks for a fresh check (`authenticatedGuard(req, res, { fresh: true })`).
 * Tokens are keyed by their hash: the map never holds a token.
 */
export class SessionCheckMemo<T> {
	private readonly entries = new Map<string, Entry<T>>();

	/**
	 * @param ttlMs How long an answer is reused; `0` reuses nothing.
	 * @param maxEntries How many tokens are remembered at once; the oldest entries go first.
	 * @param now The clock (tests pass their own).
	 * @param deadlineMs How long a check may take before it is given up: its callers get the failure (the guard
	 * answers 503, "retry later"), the entry is forgotten and the next route checks again — a stalled upstream
	 * never pins every later request of that token to one hung promise.
	 */
	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries: number = 2_000,
		private readonly now: () => number = Date.now,
		private readonly deadlineMs: number = SESSION_CHECK_DEADLINE_MS
	) {}

	/**
	 * The answer for a token: a kept one, the one in flight, or a fresh check. Every check — kept or not — runs under
	 * the deadline, and the upstream request is aborted when it passes.
	 *
	 * @param token The access token.
	 * @param check Runs the session check; the signal aborts it at the deadline.
	 * @param isKeepable Whether an answer authenticated and may be reused.
	 */
	answer(token: string, check: SessionCheckRunner<T>, isKeepable: (answer: T) => boolean): Promise<T> {
		if (this.ttlMs <= 0 || !token) {
			return this.withDeadline(check);
		}

		const key = createHash('sha256').update(token).digest('base64url');
		const now = this.now();
		const expiresAt = tokenExpiresAt(token);
		const expired = expiresAt !== undefined && expiresAt <= now;
		const existing = this.entries.get(key);
		// A kept answer within its window, or the check in flight — never for a token that has expired meanwhile: a
		// check started just before the expiry would otherwise answer for a request made after it.
		if (existing && !expired && (!existing.settled || existing.until > now)) {
			return existing.answer;
		}

		const until = expiresAt === undefined ? now + this.ttlMs : Math.min(now + this.ttlMs, expiresAt);
		if (until <= now) {
			// An expired token: checked (and refused upstream) every time, kept never.
			return this.withDeadline(check);
		}

		const entry: Entry<T> = { until, answer: undefined as unknown as Promise<T>, settled: false };
		entry.answer = this.withDeadline(check).then(
			(result) => {
				entry.settled = true;
				if (!isKeepable(result)) this.forget(key, entry);
				return result;
			},
			(error) => {
				entry.settled = true;
				this.forget(key, entry);
				throw error;
			}
		);
		// A rejection reaches every caller that awaits `answer`; this handler only keeps a check nobody awaits any
		// more from being reported as unhandled.
		entry.answer.catch(() => undefined);
		// Deleted first, so a replaced entry takes the newest place in the eviction order (insertion order = age).
		this.entries.delete(key);
		this.entries.set(key, entry);
		this.evict(now);
		return entry.answer;
	}

	/** Drops every kept answer. */
	clear(): void {
		this.entries.clear();
	}

	/** How many tokens are remembered. */
	get size(): number {
		return this.entries.size;
	}

	/**
	 * The check, or a `SessionCheckTimeoutError` once the deadline has passed without an answer — at which point the
	 * upstream request is aborted through the signal, so a stalled check does not keep a socket and a pending fetch
	 * alive behind every later one.
	 */
	withDeadline(check: SessionCheckRunner<T>): Promise<T> {
		// No deadline (0, a negative or a non-numeric value): the check runs unbounded, as before; a check that throws
		// before returning its promise still answers with a rejection, as the deadline path does
		if (!Number.isFinite(this.deadlineMs) || this.deadlineMs <= 0) {
			try {
				return check(new AbortController().signal);
			} catch (error) {
				return Promise.reject(error);
			}
		}
		return new Promise<T>((resolve, reject) => {
			const controller = new AbortController();
			const timer = setTimeout(() => {
				reject(new SessionCheckTimeoutError(this.deadlineMs));
				controller.abort(new SessionCheckTimeoutError(this.deadlineMs));
			}, this.deadlineMs);
			timer.unref?.();
			check(controller.signal).then(
				(result) => {
					clearTimeout(timer);
					resolve(result);
				},
				(error) => {
					clearTimeout(timer);
					reject(error);
				}
			);
		});
	}

	private forget(key: string, entry: Entry<T>): void {
		// Only this check's own entry: a newer check for the same token may have replaced it.
		if (this.entries.get(key) === entry) {
			this.entries.delete(key);
		}
	}

	private evict(now: number): void {
		for (const [key, entry] of this.entries) {
			if (entry.settled && entry.until <= now) this.entries.delete(key);
		}
		// Insertion order is age order: the first entries are the oldest.
		for (const key of this.entries.keys()) {
			if (this.entries.size <= this.maxEntries) break;
			this.entries.delete(key);
		}
	}
}
