/**
 * How promptly the platform pushes a written fact to an open subscription, as `GET /realtime/status` reports it
 * (`delivery`). A platform older than that field says nothing, which reads as "not prompt".
 */
export interface RealtimeDelivery {
	/** Who hands an appended event to the subscriptions: the API right away, a queue job asked for right away, or a schedule. */
	dispatch: 'inline' | 'queue' | 'none';
	/** Whether a published event reaches the sockets of every API process. */
	shared: boolean;
	/** Whether a client may rely on pushed events instead of polling. */
	prompt: boolean;
}

/**
 * Whether the live connection may stand in for the polls: only when the platform says it delivers promptly.
 * Anything else (an older platform, a malformed answer, a queue without a shared pub/sub) keeps the polls.
 */
export function deliversPromptly(answer: { delivery?: Partial<RealtimeDelivery> | null } | null | undefined): boolean {
	return answer?.delivery?.prompt === true;
}
