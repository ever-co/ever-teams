/**
 * Runs `call` with a signal that cancels it after `ms`, and stops the timer once the call ends. A call that never
 * ends (an API that sends its headers and then stalls) would hold whatever waits for it: the background's refreshes
 * go one at a time.
 */
export async function withDeadline<T>(ms: number, call: (signal: AbortSignal) => Promise<T>): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(new DOMException(`No answer within ${ms} ms`, 'TimeoutError')), ms);
	try {
		return await call(controller.signal);
	} finally {
		clearTimeout(timer);
	}
}
