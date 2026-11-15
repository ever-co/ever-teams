/**
 * Gauzy's discard refusals (ever-co/ever-gauzy#11935) answer 403 with `{ code, message }` and no `statusCode` in the
 * body. The proxy route passes a refusal on with the status its body carries, so the request must keep that status.
 */
import { gauzyErrorResponse } from '../gauzy-error-response';
import { discardTimerRequest } from './timer';

const SCOPE = { tenantId: 'tenant-1', organizationId: 'organization-1' };

describe('discardTimerRequest', () => {
	const realFetch = global.fetch;

	afterEach(() => {
		global.fetch = realFetch;
	});

	it("keeps the status of Gauzy's coded refusal, so the proxy route passes it on with its code", async () => {
		const refusal = { code: 'TIMER_DISCARD_DISABLED', message: 'Discarding is turned off.' };
		global.fetch = jest.fn(
			async () => new Response(JSON.stringify(refusal), { status: 403 })
		) as unknown as typeof fetch;

		let error: unknown;
		try {
			await discardTimerRequest(SCOPE, 'access-token');
		} catch (caught) {
			error = caught;
		}
		const response = await gauzyErrorResponse(error, 'The timer could not be discarded.');

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ ...refusal, statusCode: 403 });
	});
});
