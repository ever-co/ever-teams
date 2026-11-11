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

/** What {@link trackPromptDelivery} answers: feed it the connection's statuses, dispose it with the connection. */
export interface PromptDeliveryTracker {
	/** Called with every status of the connection; resolves once the answer for `connected` is applied. */
	onStatus(status: string): Promise<void>;
	/** Ignores every answer still on its way. */
	dispose(): void;
}

/**
 * Keeps "the platform pushes promptly" in step with one live connection: asked each time the connection comes up,
 * `false` whenever it is not up, and only the latest question counts. A reconnect during a redeploy can ask twice;
 * an older answer that arrived last would otherwise pause the polls on the word of the platform before the
 * redeploy.
 *
 * @param readStatus Asks the platform (`GET /realtime/status`).
 * @param setPrompt Receives the answer.
 */
export function trackPromptDelivery(
	readStatus: () => Promise<{ delivery?: Partial<RealtimeDelivery> | null } | null | undefined>,
	setPrompt: (prompt: boolean) => void
): PromptDeliveryTracker {
	let latest = 0;
	let disposed = false;

	return {
		async onStatus(status: string): Promise<void> {
			// Any change of status makes every question still on its way out of date.
			const asked = ++latest;
			if (disposed) return;
			if (status !== 'connected') {
				setPrompt(false);
				return;
			}
			let prompt = false;
			try {
				prompt = deliversPromptly(await readStatus());
			} catch {
				prompt = false;
			}
			if (!disposed && asked === latest) setPrompt(prompt);
		},
		dispose(): void {
			disposed = true;
			latest += 1;
		}
	};
}
