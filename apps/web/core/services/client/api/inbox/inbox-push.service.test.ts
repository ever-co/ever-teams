/**
 * `inboxPushService` as the requests leave the client: a platform with web push off answers 404, which
 * `use-inbox-web-push.ts` reads as `unavailable` (the key) or as no list (the devices), and the client keeps out of its
 * error log; any other failure of those reads is still logged, and a write's 404 stays a logged failure.
 */
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { expectOnly404Quiet, failureOf, loggedStatuses, refusingClient } from '@/test/api/refusing-client';
import { inboxPushService } from './inbox-push.service';

describe('inboxPushService', () => {
	afterEach(() => jest.restoreAllMocks());

	it.each([
		['VAPID key', () => inboxPushService.publicKey()],
		['device list', () => inboxPushService.devices()]
	])('keeps the 404 of the %s, web push off, out of the error log, and still logs a 500', async (_name, read) => {
		const notFound = await expectOnly404Quiet(inboxPushService, read);

		// What the hook reads as the platform with web push off (`stateWithoutKey`)
		expect(ApiErrorService.isApiError(notFound) && notFound.isEndpointUnavailable()).toBe(true);
	});

	it('still logs the 404 of a write', async () => {
		const refusing = refusingClient(inboxPushService);
		try {
			const errorLog = refusing.refuse(404);
			errorLog.mockClear();

			expect(await failureOf(inboxPushService.remove('device-1'))).not.toBeNull();
			expect(loggedStatuses(errorLog)).toEqual([404]);
		} finally {
			refusing.restore();
		}
	});
});
