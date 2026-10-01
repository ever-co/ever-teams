/**
 * Remembers the `jti` of every back-channel logout token this process accepted, so a replayed token is
 * refused here before it is forwarded again.
 *
 * Per process (per replica): the Gauzy API keeps the authoritative replay record. Entries live 600 s, twice
 * the 300 s a logout token stays acceptable, and at most 10,000 are kept; every entry has the same lifetime,
 * so insertion order is expiry order and the oldest entries are evicted first. No dependency, no I/O, and
 * `seen` is synchronous, so two requests in one process cannot both pass it with the same `jti`.
 */
export class JtiReplayCache {
	private readonly entries = new Map<string, number>();

	constructor(
		private readonly ttlMs = 600_000,
		private readonly maxEntries = 10_000,
		private readonly now: () => number = () => Date.now()
	) {}

	/** Records `jti`; `true` when it was already recorded and has not expired (a replay). */
	seen(jti: string): boolean {
		const now = this.now();
		const expiresAt = this.entries.get(jti);
		if (expiresAt !== undefined && expiresAt > now) return true;
		this.entries.delete(jti);
		this.entries.set(jti, now + this.ttlMs);
		this.evict(now);
		return false;
	}

	/** How many entries are kept. */
	get size(): number {
		return this.entries.size;
	}

	private evict(now: number): void {
		for (const [jti, expiresAt] of this.entries) {
			if (expiresAt > now && this.entries.size <= this.maxEntries) break;
			this.entries.delete(jti);
		}
	}
}

/** The cache the back-channel logout route uses. */
export const logoutJtiCache = new JtiReplayCache();
