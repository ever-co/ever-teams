/**
 * `refuseUnlessPermitted` reads the role's permissions from Gauzy with the session's cookies before a proxy route
 * forwards a write: a write of another site's page is refused before that read, as forwardToGauzy would refuse it after.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { refuseUnlessPermitted } from './refuse-without-permission';

afterEach(restoreFetch);

const PERMITTED = () => true;

describe('refuseUnlessPermitted', () => {
	it.each(FOREIGN_ORIGIN_HEADERS)(
		'refuses a write from %s before the permissions are read',
		async (_label, headers) => {
			const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
			const req = signedInRequest(
				`${APP_ORIGIN}/api/timer/started-at`,
				'PUT',
				{ startedAt: '2026-11-17T08:00:00Z' },
				headers
			);

			const refusal = await refuseUnlessPermitted(req, PERMITTED);

			expect(refusal?.status).toBe(403);
			await expect(refusal?.json()).resolves.toEqual({ statusCode: 403, message: 'Cross-site request refused' });
			expect(fetchMock).not.toHaveBeenCalled();
			expect(req.bodyUsed).toBe(false);
		}
	);

	it.each([
		["this app's own pages", SAME_ORIGIN_HEADERS],
		['a client that sends no Origin', {}]
	])('reads the permissions for a write from %s', async (_label, headers) => {
		const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		const req = signedInRequest(
			`${APP_ORIGIN}/api/timer/started-at`,
			'PUT',
			{ startedAt: '2026-11-17T08:00:00Z' },
			headers
		);

		await expect(refuseUnlessPermitted(req, PERMITTED)).resolves.toBeNull();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe(gauzyUrl('/role-permissions/me'));
	});

	it('reads the permissions for a read of another site, which only a write is refused for', async () => {
		const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		const [, foreign] = FOREIGN_ORIGIN_HEADERS[0];

		await expect(
			refuseUnlessPermitted(signedInRequest(`${APP_ORIGIN}/api/invoices/1`, 'GET', undefined, foreign), PERMITTED)
		).resolves.toBeNull();

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
