/**
 * Test-only (never part of the app). `serverFetch` rejects a non-2xx answer with `throw Promise.reject(data)`:
 * the route catches the outer rejection, but the inner promise is never handled, and Jest fails whichever test
 * is running when it sees that. This marks each such promise handled; it stays rejected with the same reason,
 * so the route behaves exactly as before. `jest.restoreAllMocks()` undoes it.
 */
export function tolerateServerFetchRejections(): void {
	const reject = Promise.reject.bind(Promise) as (reason?: unknown) => Promise<never>;
	jest.spyOn(Promise, 'reject').mockImplementation(((reason?: unknown) => {
		const rejected = reject(reason);
		rejected.catch(() => undefined);
		return rejected;
	}) as typeof Promise.reject);
}
