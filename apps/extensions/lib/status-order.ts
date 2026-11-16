/**
 * Orders the timer statuses the background shows on the badge and sends to the popup. The background's own reads
 * and the reads the popup reports (after a start or a stop) share one sequence: an answer is shown only when nothing
 * newer was sent or reported since its read left. An alarm's read that left before a stop, and answered after the
 * popup reported the stopped timer, would otherwise show the run as running again.
 */
export function createStatusOrder() {
	let latest = 0;
	// What `latest` was when the last session ended: equal to it while nothing was sent nor reported since
	let endedAt = 0;
	return {
		/** A read of the background leaves: the ticket its answer is checked with. */
		readSent(): number {
			latest += 1;
			return latest;
		},
		/** Whether the answer of the read with this ticket is still the newest status the background knows of. */
		isLatest(ticket: number): boolean {
			return ticket === latest;
		},
		/** The popup reported a status it read: every read already out is older than it. Answers its own ticket. */
		reported(): number {
			latest += 1;
			return latest;
		},
		/**
		 * The session the reads were made for ended (a sign-out, another person or API signed in): every read already
		 * out answers for it, and must not show its timer again. Idempotent: one sign-out reaches the background by
		 * several paths (a refresh, a requested refresh, the storage listener, a refused call), and only the first
		 * ends anything. Answers whether this call did: false when nothing was sent nor reported since the last end.
		 */
		sessionEnded(): boolean {
			if (latest === endedAt) {
				return false;
			}
			latest += 1;
			endedAt = latest;
			return true;
		}
	};
}
